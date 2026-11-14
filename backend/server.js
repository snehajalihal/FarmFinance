
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Check database connection
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        return;
    }

    console.log('MySQL connected successfully!');
});

// Test API
app.get('/', (req, res) => {
    res.send('Farm Financial Management API is running!');
});

// ====================================
// TRANSACTION MANAGEMENT APIs
// ====================================

// GET all transactions
app.get('/api/transactions', (req, res) => {
    const sql = `
        SELECT
            t.*,
            c.crop_name
        FROM transactions t
        LEFT JOIN crops c ON t.crop_id = c.id
        ORDER BY t.transaction_date DESC, t.id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json(results);
    });
});

// ADD a new transaction
app.post('/api/transactions', (req, res) => {
    const {
        transaction_type,
        description,
        amount,
        transaction_date,
        crop_id
    } = req.body;

    const validCropId =
        crop_id === null || crop_id === undefined || crop_id === ''
            ? null
            : Number(crop_id);

    if (
        !['Income', 'Expense'].includes(transaction_type) ||
        typeof description !== 'string' ||
        !description.trim() ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(transaction_date || '') ||
        (
            validCropId !== null &&
            (!Number.isSafeInteger(validCropId) || validCropId <= 0)
        )
    ) {
        return res.status(400).json({
            error: 'Please provide valid transaction details.'
        });
    }

    const sql = `
        INSERT INTO transactions (
            transaction_type,
            description,
            amount,
            transaction_date,
            crop_id
        )
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            transaction_type,
            description.trim(),
            amount,
            transaction_date,
            validCropId
        ],
        (err, result) => {
            if (err) {
                if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                    return res.status(400).json({
                        error: 'Selected crop does not exist.'
                    });
                }

                return res.status(500).json({
                    error: 'Unable to save transaction.'
                });
            }

            res.status(201).json({
                message: 'Transaction added successfully!',
                id: result.insertId
            });
        }
    );
});

// UPDATE an existing transaction
app.put('/api/transactions/:id', (req, res) => {
    const transactionId = Number(req.params.id);

    const {
        transaction_type,
        description,
        amount,
        transaction_date,
        crop_id
    } = req.body;

    const validCropId =
        crop_id === null || crop_id === undefined || crop_id === ''
            ? null
            : Number(crop_id);

    if (!Number.isSafeInteger(transactionId) || transactionId <= 0) {
        return res.status(400).json({
            error: 'Invalid transaction ID.'
        });
    }

    if (
        !['Income', 'Expense'].includes(transaction_type) ||
        typeof description !== 'string' ||
        !description.trim() ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(transaction_date || '') ||
        (
            validCropId !== null &&
            (!Number.isSafeInteger(validCropId) || validCropId <= 0)
        )
    ) {
        return res.status(400).json({
            error: 'Please provide valid transaction details.'
        });
    }

    const sql = `
        UPDATE transactions
        SET
            transaction_type = ?,
            description = ?,
            amount = ?,
            transaction_date = ?,
            crop_id = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            transaction_type,
            description.trim(),
            amount,
            transaction_date,
            validCropId,
            transactionId
        ],
        (err, result) => {
            if (err) {
                if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                    return res.status(400).json({
                        error: 'Selected crop does not exist.'
                    });
                }

                return res.status(500).json({
                    error: 'Unable to update transaction.'
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: 'Transaction not found.'
                });
            }

            res.json({
                message: 'Transaction updated successfully!'
            });
        }
    );
});

// DELETE a transaction
app.delete('/api/transactions/:id', (req, res) => {
    const transactionId = Number(req.params.id);

    if (!Number.isSafeInteger(transactionId) || transactionId <= 0) {
        return res.status(400).json({
            error: 'Invalid transaction ID.'
        });
    }

    db.query(
        'DELETE FROM transactions WHERE id = ?',
        [transactionId],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    error: 'Unable to delete transaction.'
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: 'Transaction not found.'
                });
            }

            res.json({
                message: 'Transaction deleted successfully!'
            });
        }
    );
});

// ====================================
// CROP MANAGEMENT APIs
// ====================================

// GET all crops
app.get('/api/crops', (req, res) => {
    const sql = `
        SELECT *
        FROM crops
        ORDER BY created_at DESC, id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json(results);
    });
});

// ADD a new crop
app.post('/api/crops', (req, res) => {
    const {
        crop_name,
        variety,
        season,
        area,
        area_unit,
        sowing_date,
        expected_harvest_date,
        status
    } = req.body;

    if (
        typeof crop_name !== 'string' ||
        !crop_name.trim() ||
        !Number.isFinite(area) ||
        area <= 0 ||
        !['Planned', 'Growing', 'Harvested'].includes(status)
    ) {
        return res.status(400).json({
            error: 'Please provide valid crop details.'
        });
    }

    const sql = `
        INSERT INTO crops (
            crop_name,
            variety,
            season,
            area,
            area_unit,
            sowing_date,
            expected_harvest_date,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            crop_name.trim(),
            variety || null,
            season || null,
            area,
            area_unit || 'Acres',
            sowing_date || null,
            expected_harvest_date || null,
            status
        ],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    error: 'Unable to save crop.'
                });
            }

            res.status(201).json({
                message: 'Crop added successfully!',
                id: result.insertId
            });
        }
    );
});

// UPDATE an existing crop
app.put('/api/crops/:id', (req, res) => {
    const cropId = Number(req.params.id);

    const {
        crop_name,
        variety,
        season,
        area,
        area_unit,
        sowing_date,
        expected_harvest_date,
        status
    } = req.body;

    if (!Number.isSafeInteger(cropId) || cropId <= 0) {
        return res.status(400).json({
            error: 'Invalid crop ID.'
        });
    }

    if (
        typeof crop_name !== 'string' ||
        !crop_name.trim() ||
        !Number.isFinite(area) ||
        area <= 0 ||
        !['Planned', 'Growing', 'Harvested'].includes(status)
    ) {
        return res.status(400).json({
            error: 'Please provide valid crop details.'
        });
    }

    const sql = `
        UPDATE crops
        SET
            crop_name = ?,
            variety = ?,
            season = ?,
            area = ?,
            area_unit = ?,
            sowing_date = ?,
            expected_harvest_date = ?,
            status = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            crop_name.trim(),
            variety || null,
            season || null,
            area,
            area_unit || 'Acres',
            sowing_date || null,
            expected_harvest_date || null,
            status,
            cropId
        ],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    error: 'Unable to update crop.'
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: 'Crop not found.'
                });
            }

            res.json({
                message: 'Crop updated successfully!'
            });
        }
    );
});


// DELETE a crop
app.delete('/api/crops/:id', (req, res) => {
    const cropId = Number(req.params.id);

    if (!Number.isSafeInteger(cropId) || cropId <= 0) {
        return res.status(400).json({
            error: 'Invalid crop ID.'
        });
    }

    db.query(
        'DELETE FROM crops WHERE id = ?',
        [cropId],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    error: 'Unable to delete crop.'
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: 'Crop not found.'
                });
            }

            res.json({
                message: 'Crop deleted successfully!'
            });
        }
    );
});

// ====================================
// CROP FINANCIAL ANALYSIS API
// ====================================

// GET crop-wise financial performance
app.get('/api/crops/financial-summary', (req, res) => {
    const sql = `
        SELECT
            c.id,
            c.crop_name,
            c.variety,
            c.status,
            COALESCE(SUM(
                CASE
                    WHEN t.transaction_type = 'Income' THEN t.amount
                    ELSE 0
                END
            ), 0) AS total_income,
            COALESCE(SUM(
                CASE
                    WHEN t.transaction_type = 'Expense' THEN t.amount
                    ELSE 0
                END
            ), 0) AS total_expenses,
            COALESCE(SUM(
                CASE
                    WHEN t.transaction_type = 'Income' THEN t.amount
                    WHEN t.transaction_type = 'Expense' THEN -t.amount
                    ELSE 0
                END
            ), 0) AS net_profit
        FROM crops c
        LEFT JOIN transactions t ON c.id = t.crop_id
        GROUP BY c.id, c.crop_name, c.variety, c.status
        ORDER BY c.crop_name, c.id
    `;

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json(results);
    });
});

// ====================================
// MONTHLY FINANCIAL REPORT API
// ====================================

// GET monthly income, expenses and net profit
app.get('/api/reports/monthly', async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT
                DATE_FORMAT(transaction_date, '%Y-%m') AS month,
                SUM(CASE
                    WHEN transaction_type = 'Income' THEN amount
                    ELSE 0
                END) AS total_income,
                SUM(CASE
                    WHEN transaction_type = 'Expense' THEN amount
                    ELSE 0
                END) AS total_expenses,
                SUM(CASE
                    WHEN transaction_type = 'Income' THEN amount
                    ELSE -amount
                END) AS net_profit
            FROM transactions
            GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
            ORDER BY month ASC
        `);

        res.json(rows);
    } catch (error) {
        console.error('Monthly report error:', error);

        res.status(500).json({
            message: 'Unable to generate monthly reports'
        });
    }
});

// ====================================
// START SERVER
// ====================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
