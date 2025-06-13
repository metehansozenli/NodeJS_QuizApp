// Controller for managing questions and options
const db = require('../config/db_config');

exports.addQuestion = async (req, res) => {
  try {
    const { quizId, questionText, multimediaUrl } = req.body;

    // Insert the new question into the database
    const result = await db.query(
      'INSERT INTO questions (quiz_id, question_text, multimedia_url) VALUES ($1, $2, $3) RETURNING *',
      [quizId, questionText, multimediaUrl]
    );

    res.status(201).json({ message: 'Question added successfully', question: result.rows[0] });
  } catch (error) {
    console.error('Error adding question:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getQuestions = async (req, res) => {
  try {
    const { quizId } = req.params;
    // Soruları ve şıklarını birlikte döndür
    const result = await db.query('SELECT * FROM questions WHERE quiz_id = $1', [quizId]);
    const questions = result.rows;
    for (const q of questions) {
      const opts = await db.query('SELECT * FROM options WHERE question_id = $1', [q.id]);
      q.options = opts.rows;
    }
    res.status(200).json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};
