import express from 'express';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuración para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración BD
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // Tu usuario
    password: '', // Tu contraseña
    database: 'mueve', // Nombre de tu BD
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 1. VISTA PRINCIPAL: Lista simplificada de transacciones
app.get('/', async (req, res) => {
    try {
        const [transactions] = await pool.query(`
            SELECT t.id, t.payment_reference, t.user_id, u.name as user_name, t.transaction_type, t.total_usd, t.status, t.created_at
            FROM transactions t 
            JOIN users u ON t.user_id = u.id 
            ORDER BY t.created_at DESC
        `);
        res.render('index', { transactions });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error interno del servidor");
    }
});

// 2. VISTA DEL USUARIO: Detalles, métodos de pago y sus transacciones detalladas
app.get('/user/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        
        if (!user) {
            return res.status(404).send('Usuario no encontrado');
        }

        const [methods] = await pool.query('SELECT * FROM payment_methods WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        const [transactions] = await pool.query('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC', [userId]);

        res.render('user', { user, methods, transactions });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error interno del servidor");
    }
});

// 3. API: Actualizar estado de transacción
app.post('/api/transaction/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const transactionId = req.params.id;
        
        if (!['Pendiente', 'Completado', 'Cancelado'].includes(status)) {
            return res.status(400).json({ success: false, message: "Estado inválido" });
        }

        await pool.query('UPDATE transactions SET status = ? WHERE id = ?', [status, transactionId]);
        res.json({ success: true, newStatus: status });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error al actualizar" });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});