const User = require('../models/User');
const jwt = require('jsonwebtoken');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[a-zA-Zа-яА-ЯёЁ\s'-]{2,50}$/;

const validateEmail = (email) => {
    if (!email || typeof email !== 'string') {
        return { valid: false, message: 'Email обязателен' };
    }
    
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!EMAIL_REGEX.test(trimmedEmail)) {
        return { 
            valid: false, 
            message: 'Неверный формат email. Пример: user@example.com' 
        };
    }
    
    // Проверка домена
    const domain = trimmedEmail.split('@')[1];
    const validDomains = ['.com', '.ru', '.org', '.net', '.edu', '.gov', '.io', '.co'];
    const hasValidDomain = validDomains.some(tld => domain.endsWith(tld));
    
    if (!hasValidDomain) {
        return { 
            valid: false, 
            message: 'Недопустимый домен email. Используйте .com, .ru, .org и т.д.' 
        };
    }
    
    return { valid: true, email: trimmedEmail };
};

const validateName = (name) => {
    if (!name || typeof name !== 'string') {
        return { valid: false, message: 'Имя обязательно' };
    }
    
    const trimmedName = name.trim();
    
    if (trimmedName.length < 2) {
        return { 
            valid: false, 
            message: 'Имя должно содержать минимум 2 символа' 
        };
    }
    
    if (trimmedName.length > 50) {
        return { 
            valid: false, 
            message: 'Имя не должно превышать 50 символов' 
        };
    }
    
    if (!NAME_REGEX.test(trimmedName)) {
        return { 
            valid: false, 
            message: 'Имя может содержать только буквы, пробелы, дефисы и апострофы' 
        };
    }
    
    return { valid: true, name: trimmedName };
};

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const nameValidation = validateName(name);
        if (!nameValidation.valid) {
            return res.status(400).json({ error: nameValidation.message });
        }
        
        // ✅ Валидация email
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            return res.status(400).json({ error: emailValidation.message });
        }

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Все поля обязательны' });
        }

        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email уже зарегистрирован' });
        }

        const user = await User.create(nameValidation.name, emailValidation.email, password);

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            user: { id: user.id, name: user.name, email: user.email },
            token
        });
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            return res.status(400).json({ error: emailValidation.message });
        }

        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        const isValid = await User.verifyPassword(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        console.log('✅ Успешный вход, токен:', token.substring(0, 30) + '...');

        res.json({
            message: 'Успешный вход',
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            token
        });
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const stats = await User.getStats(req.user.id);
        
        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                created_at: user.created_at
            },
            stats
        });
    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, email } = req.body;
        
        // ✅ Валидация имени (если передано)
        if (name) {
            const nameValidation = validateName(name);
            if (!nameValidation.valid) {
                return res.status(400).json({ error: nameValidation.message });
            }
        }
        
        // ✅ Валидация email (если передано)
        if (email) {
            const emailValidation = validateEmail(email);
            if (!emailValidation.valid) {
                return res.status(400).json({ error: emailValidation.message });
            }
        }
        
        const user = await User.update(
            req.user.id, 
            name ? validateName(name).name : undefined, 
            email ? validateEmail(email).email : undefined
        );
        
        res.json({
            message: 'Профиль обновлен',
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email 
            }
        });
    } catch (error) {
        console.error('Ошибка обновления профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

exports.validateEmail = validateEmail;
exports.validateName = validateName;