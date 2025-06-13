// Controller for question bank
const db = require('../config/db_config');

// Table name may vary: use soru_bankasi if exists else question_bank
const TABLE = 'soru_bankasi';

async function ensureTable() {
  // Quick check whether soru_bankasi exists; if not, fallback
  try {
    await db.query(`SELECT 1 FROM ${TABLE} LIMIT 1`);
  } catch (err) {
    return 'question_bank';
  }
  return TABLE;
}

exports.addQuestionToBank = async (req, res) => {
  const table = await ensureTable();
  try {
    // Support both simple and full option based insert
    if(table === 'soru_bankasi'){
      const { kategori, soru, secenek_a, secenek_b, secenek_c, secenek_d, dogru_sik } = req.body;
      if(!kategori || !soru || !secenek_a || !secenek_b || !secenek_c || !secenek_d || !dogru_sik){
        return res.status(400).json({error:'All fields are required'});
      }
      await db.query(
        `INSERT INTO ${table} (kategori, soru, secenek_a, secenek_b, secenek_c, secenek_d, dogru_sik) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [kategori, soru, secenek_a, secenek_b, secenek_c, secenek_d, dogru_sik]
      );
    }else{
      // Generic english column version
      const { category, question_text, option_a, option_b, option_c, option_d, correct_option } = req.body;
      if(!category || !question_text || !option_a || !option_b || !option_c || !option_d || !correct_option){
        return res.status(400).json({error:'All fields are required'});
      }
      await db.query(
        `INSERT INTO ${table} (category, question_text, option_a, option_b, option_c, option_d, correct_option) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [category, question_text, option_a, option_b, option_c, option_d, correct_option]
      );
    }
    res.status(201).json({ message: 'Question added to bank successfully' });
  } catch (err) {
    console.error('Error adding question to bank', err);
    res.status(500).json({ error: 'Failed to add question to bank' });
  }
};

exports.deleteQuestionFromBank = async (req, res) => {
  const table = await ensureTable();
  try {
    const { questionId } = req.params;
    await db.query(`DELETE FROM ${table} WHERE id = $1`, [questionId]);
    res.status(200).json({ message: 'Question deleted from bank' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete question from bank' });
  }
};

exports.updateQuestionInBank = async (req, res) => {
  const table = await ensureTable();
  try {
    const { questionId } = req.params;
    const { questionText, multimediaUrl } = req.body;
    await db.query(`UPDATE ${table} SET question_text = $1, multimedia_url = $2 WHERE id = $3`, [questionText, multimediaUrl, questionId]);
    res.status(200).json({ message: 'Question updated in bank' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update question in bank' });
  }
};

exports.getQuestionBank = async (req, res) => {
  const table = await ensureTable();
  try {
    const { category } = req.query;
    let result;
    if (category) {
      result = await db.query(`SELECT * FROM ${table} WHERE kategori = $1`, [category]);
    } else {
      result = await db.query(`SELECT * FROM ${table}`);
    }
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch question bank' });
  }
};

exports.addBankQuestionsToQuiz = async (req, res) => {
  const table = await ensureTable();
  try {
    const { quizId, questionIds } = req.body; // questionIds: [id, id, ...]
    for (const qid of questionIds) {
      // Soru içeriğini çek
      const qRes = await db.query(`SELECT * FROM ${table} WHERE id = $1`, [qid]);
      if (qRes.rowCount === 0) continue;
      const q = qRes.rows[0];
      await db.query(
        'INSERT INTO questions (quiz_id, question_text, multimedia_url) VALUES ($1, $2, $3)',
        [quizId, q.question_text, q.multimedia_url]
      );
    }
    res.status(201).json({ message: 'Questions added to quiz from bank' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add questions from bank' });
  }
};

// Yeni: Kategorileri listele
exports.getCategories = async (req, res) => {
  const table = await ensureTable();
  try {
    const result = await db.query(`SELECT DISTINCT kategori FROM ${table}`);
    res.status(200).json(result.rows.map(r => r.kategori));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// Yeni: Rastgele soru çek
exports.getRandomQuestions = async (req, res) => {
  const table = await ensureTable();
  try {
    const { category, count = 1 } = req.query;
    const cnt = parseInt(count) || 1;
    let query, params;
    if (category) {
      query = `SELECT * FROM ${table} WHERE kategori = $1 ORDER BY random() LIMIT $2`;
      params = [category, cnt];
    } else {
      query = `SELECT * FROM ${table} ORDER BY random() LIMIT $1`;
      params = [cnt];
    }
    const result = await db.query(query, params);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch random questions' });
  }
};
