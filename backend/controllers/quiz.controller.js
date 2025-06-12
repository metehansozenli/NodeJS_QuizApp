// Controller for quiz management
const db = require('../config/db_config');

// Get all public quizzes
exports.getQuizzes = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM quizzes WHERE is_public = true ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
};

// Create a new quiz
exports.createQuiz = async (req, res) => {
  try {
    const { title, description, is_public, background_music_url, questions } = req.body;
    
    // Geçici olarak authentication devre dışı - development için
    const created_by = req.user?.id || 1; // Test için default user ID 1

    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Validate title length
    if (title.length > 100) {
      return res.status(400).json({ error: 'Title must be less than 100 characters' });
    }

    // Validate description length if provided
    if (description && description.length > 500) {
      return res.status(400).json({ error: 'Description must be less than 500 characters' });
    }    // Create quiz
    const result = await db.query(
      'INSERT INTO quizzes (title, description, created_by, is_public, background_music_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description, created_by, is_public || false, background_music_url]
    );

    const quiz = result.rows[0];

    // If questions are provided, add them to the quiz
    if (questions && questions.length > 0) {      for (const question of questions) {
        const questionResult = await db.query(
          'INSERT INTO questions (quiz_id, question_text, image_url, video_url, duration_seconds, points) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          (()=>{
            const media = question.media_url || '';
            const isVid = /youtube|\.mp4|\.mov|\.webm/i.test(media);
            const imgUrl = isVid ? null : media;
            const vidUrl = isVid ? media : null;
            return [
              quiz.id,
              question.question_text || question.text,
              imgUrl,
              vidUrl,
              question.duration_seconds || question.time_limit || 30,
              question.points || 10
            ];
          })()
        );

        const questionId = questionResult.rows[0].id;

        // Add options for this question
        if (question.options && question.options.length > 0) {
          for (let i = 0; i < question.options.length; i++) {
            const option = question.options[i];
            await db.query(
              'INSERT INTO options (question_id, option_text, is_correct) VALUES ($1, $2, $3)',
              [questionId, option.text || option.option_text, option.is_correct || option.isCorrect || false]
            );
          }
        }
      }
    }

    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
};

// Get all quizzes for a host
exports.getHostQuizzes = async (req, res) => {
  try {
    // Kullanıcı authentication'ını zorunlu kıl
    const created_by = req.user?.id || 1; // Test için default 1, production'da kaldırılmalı
    
    console.log('getHostQuizzes called for user:', created_by);

    // Sadece kullanıcının kendi quiz'lerini getir
    const query = 'SELECT * FROM quizzes WHERE created_by = $1 ORDER BY created_at DESC';
    const params = [created_by];
    
    const result = await db.query(query, params);

    // Get questions count for each quiz
    const quizzes = await Promise.all(
      result.rows.map(async (quiz) => {
        const questionsResult = await db.query(
          'SELECT COUNT(*) FROM questions WHERE quiz_id = $1',
          [quiz.id]
        );
        return {
          ...quiz,
          questions_count: parseInt(questionsResult.rows[0].count),
        };
      })
    );

    console.log(`Found ${quizzes.length} quizzes for user ${created_by}`);
    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching host quizzes:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
};

// Get a single quiz with its questions and options
exports.getQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    
    // Debug log
    console.log('getQuiz called with quizId:', quizId);
    
    // Validate quizId is a number
    if (!quizId || isNaN(quizId)) {
      return res.status(400).json({ error: 'Invalid quiz ID' });
    }

    // Get quiz details
    const quizResult = await db.query(
      'SELECT * FROM quizzes WHERE id = $1',
      [quizId]
    );

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const quiz = quizResult.rows[0];

    // Get questions with their options
    const questionsResult = await db.query(
      'SELECT * FROM questions WHERE quiz_id = $1 ORDER BY id',
      [quizId]
    );

    const questions = await Promise.all(
      questionsResult.rows.map(async (question) => {
        const optionsResult = await db.query(
          'SELECT * FROM options WHERE question_id = $1 ORDER BY id',
          [question.id]
        );
        return {
          ...question,
          options: optionsResult.rows,
        };
      })
    );

    res.json({
      ...quiz,
      questions,
    });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
};

// Add a question to a quiz
exports.addQuestion = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { quizId } = req.params;
    const {
      question_text,
      media_url,
      time_limit,
      points,
      options,
      correct_option_index,    } = req.body;
    const host_id = req.user?.id || 1; // Test için default user ID 1    // Check if quiz exists and belongs to host
    const quizResult = await client.query(
      'SELECT * FROM quizzes WHERE id = $1 AND created_by = $2',
      [quizId, host_id]
    );

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Validate required fields
    if (!question_text || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Question text and at least 2 options are required' });
    }

    if (correct_option_index === undefined || correct_option_index < 0 || correct_option_index >= options.length) {
      return res.status(400).json({ error: 'Valid correct option index is required' });
    }    // Insert question
    const questionResult = await client.query(
      'INSERT INTO questions (quiz_id, question_text, image_url, video_url, duration_seconds, points) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      (()=>{
        const isVid = /youtube|\.mp4|\.mov|\.webm/i.test(media_url || '');
        const imgUrl = isVid ? null : media_url;
        const vidUrl = isVid ? media_url : null;
        return [
          quizId,
          question_text,
          imgUrl,
          vidUrl,
          time_limit || 30,
          points || 10
        ];
      })()
    );

    const question = questionResult.rows[0];

    // Insert options
    const optionValues = options.map((text, index) => ({
      text,
      is_correct: index === correct_option_index,
    }));    for (const option of optionValues) {
      await client.query(
        'INSERT INTO options (question_id, option_text, is_correct) VALUES ($1, $2, $3)',
        [question.id, option.text, option.is_correct]
      );
    }    // Get the complete question with options
    const optionsResult = await client.query(
      'SELECT * FROM options WHERE question_id = $1 ORDER BY id',
      [question.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      ...question,
      options: optionsResult.rows,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding question:', error);
    res.status(500).json({ error: 'Failed to add question' });
  } finally {
    client.release();
  }
};

// Update a question
exports.updateQuestion = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { quizId, questionId } = req.params;
    const {
      question_text,
      media_url,
      time_limit,
      points,
      options,
      correct_option_index,
    } = req.body;
    const host_id = req.user?.id || 1; // Test için default user ID 1    // Check if quiz exists and belongs to host
    const quizResult = await client.query(
      'SELECT * FROM quizzes WHERE id = $1 AND created_by = $2',
      [quizId, host_id]
    );

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }    // Check if question exists
    const questionResult = await client.query(
      'SELECT * FROM questions WHERE id = $1 AND quiz_id = $2',
      [questionId, quizId]
    );

    if (questionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Validate required fields
    if (!question_text || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Question text and at least 2 options are required' });
    }

    if (correct_option_index === undefined || correct_option_index < 0 || correct_option_index >= options.length) {
      return res.status(400).json({ error: 'Valid correct option index is required' });
    }    // Update question
    const updatedQuestionResult = await client.query(
      'UPDATE questions SET question_text = $1, image_url = $2, video_url = $3, duration_seconds = $4, points = $5 WHERE id = $6 RETURNING *',
      [question_text, media_url, null, time_limit || 30, points || 10, questionId]
    );    // Delete existing options
    await client.query('DELETE FROM options WHERE question_id = $1', [questionId]);

    // Insert new options
    const optionValues = options.map((text, index) => ({
      text,
      is_correct: index === correct_option_index,
    }));    for (const option of optionValues) {
      await client.query(
        'INSERT INTO options (question_id, option_text, is_correct) VALUES ($1, $2, $3)',
        [questionId, option.text, option.is_correct]
      );
    }    // Get the complete question with options
    const optionsResult = await client.query(
      'SELECT * FROM options WHERE question_id = $1 ORDER BY id',
      [questionId]
    );

    await client.query('COMMIT');

    res.json({
      ...updatedQuestionResult.rows[0],
      options: optionsResult.rows,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  } finally {
    client.release();
  }
};

// Delete a question
exports.deleteQuestion = async (req, res) => {
  try {
    const { quizId, questionId } = req.params;
    const host_id = req.user?.id || 1; // Test için default user ID 1    // Check if quiz exists and belongs to host
    const quizResult = await db.query(
      'SELECT * FROM quizzes WHERE id = $1 AND created_by = $2',
      [quizId, host_id]
    );

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }    // Check if question exists
    const questionResult = await db.query(
      'SELECT * FROM questions WHERE id = $1 AND quiz_id = $2',
      [questionId, quizId]
    );

    if (questionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Delete question (cascade will delete options)
    await db.query('DELETE FROM questions WHERE id = $1', [questionId]);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
};

// Delete a quiz
exports.deleteQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const created_by = req.user?.id;

    // Check if quiz exists
    let quizResult;
    if (created_by) {
      // Check if quiz belongs to user
      quizResult = await db.query(
        'SELECT * FROM quizzes WHERE id = $1 AND created_by = $2',
        [quizId, created_by]
      );
    } else {
      // For testing without auth, just check if quiz exists
      quizResult = await db.query(
        'SELECT * FROM quizzes WHERE id = $1',
        [quizId]
      );
    }

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Delete quiz (cascade will delete questions and options)
    await db.query('DELETE FROM quizzes WHERE id = $1', [quizId]);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
};
