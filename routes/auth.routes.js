const {Router} = require('express')
const bcrypt = require('bcryptjs')
const config = require('config')
const jwt = require('jsonwebtoken')
const {check, validationResult} = require('express-validator')
const User = require('../models/User')
const router = Router()


// /api/auth/register
router.post(
  '/register',
  [
    check('password', 'Минимальная длина пароля 6 символов')
      .isLength({ min: 6 }),
    check('email', 'Некорректный email').isEmail()
  ],
  async (req, res) => {
  try {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
        message: errors.array()[errors.array().length - 1].msg
      })
    }

    const {email, password} = req.body

    const candidate = await User.findOne({ email })

    if (candidate) {
      return res.status(400).json({ message: 'Такой пользователь уже существует' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = new User({ email: email, password: hashedPassword})

    await user.save()

    res.status(201).json({ message: 'Пользователь создан' })
  } catch (e) {
    res.status(500).json({ message: 'Что-то пошло не так... Попробуй снова' })
  }
})

// /api/auth/login
router.post(
  '/login',
  [
    check('email', 'Введите корректный email').normalizeEmail().isEmail(),
    check('password', 'Введите пароль').exists()

  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
          message: errors.array()[0].msg
        })
      }

      const {email, password} = req.body

      const user = await User.findOne({ email })

      if (!user) {
        return res.status(400).json({ message: 'Такого пользователя не существует' })
      }

      const isMatch = await bcrypt.compare(password, user.password)

      if (!isMatch) {
        return res.status(400).json({ message: 'Неверный пароль. Попробуйте снова'})
      }

      const token = jwt.sign(
        { userID: user.id},
        config.get('jwtSecret'),
        { expiresIn: '1h' }
      )

      return res.status(200).json({ token, userId: user.id })
    } catch (e) {
      res.status(500).json({ message: 'Что-то пошло не так... Попробуйте снова' })
    }
})

module.exports = router