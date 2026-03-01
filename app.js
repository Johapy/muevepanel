import express from 'express';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

// Recreando __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de EJS y middlewares
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de la Base de Datos (Ajusta con tus credenciales)
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // tu usuario
    password: '', // tu contraseña
    database: 'tu_base_de_datos', // el nombre de tu BD
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Ruta principal: Renderiza el dashboard
app.get('/', async (req, res) => {
    try {
        const [transactions] = await pool.query(`
            SELECT t.*, u.name as user_name, u.email as user_email 
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

// API: Actualizar estado de transacción
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

// API: Obtener detalles completos del usuario para el Modal
app.get('/api/user/:id/details', async (req, res) => {
    try {
        const userId = req.params.id;
        
        const [[user]] = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = ?', [userId]);
        const [methods] = await pool.query('SELECT * FROM payment_methods WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        const [transactions] = await pool.query('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        
        res.json({ success: true, data: { user, methods, transactions } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error al obtener datos" });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});