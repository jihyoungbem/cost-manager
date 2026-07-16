const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(express.json());

// Render가 제공하는 DB 연결 주소 바인딩
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// 데이터베이스 초기화 (테이블이 없으면 자동 생성)
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS site_cost (
                id SERIAL PRIMARY KEY,
                total_a TEXT DEFAULT '0',
                total_b TEXT DEFAULT '0',
                monthly_data JSONB DEFAULT '[]',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("데이터베이스 테이블 준비 완료.");
    } catch (err) {
        console.error("테이블 생성 실패:", err);
    }
}
initDB();

// 정적 파일(HTML)을 화면에 띄우기 위한 설정
app.use(express.static(path.join(__dirname, 'public')));

// 1. 자료 불러오기 API (GET)
app.get('/api/data', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM site_cost ORDER BY id DESC LIMIT 1');
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.json({ total_a: "0", total_b: "0", monthly_data: [] });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. 자료 저장하기 API (POST)
app.post('/api/data', async (req, res) => {
    const { total_a, total_b, monthly_data } = req.body;
    try {
        // 기존 데이터를 다 지우고 최신 데이터 1건만 유지하는 구조
        await pool.query('DELETE FROM site_cost');
        const result = await pool.query(
            'INSERT INTO site_cost (total_a, total_b, monthly_data) VALUES ($1, $2, $3) RETURNING *',
            [total_a, total_b, JSON.stringify(monthly_data)]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`서버가 포트 ${PORT}에서 작동 중입니다.`));