import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import nodemailer from 'nodemailer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // Hôte du serveur SMTP Gmail
  port: 587, // Port pour TLS
  secure: false, // Utiliser TLS, mais ne sécurise pas la connexion dès le départ
  auth: {
    user: 'nachit.mounir@gmail.com', // Votre adresse email
    pass: 'txxe qxuv keqz pwmc', // Votre mot de passe (ou mot de passe d'application si l'authentification à deux facteurs est activée)
  },
  tls: {
    rejectUnauthorized: false, // Permet d'ignorer les problèmes de certificat SSL (pas recommandé en production)
  },
});

// MongoDB Models
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nom: String,
  prenom: String,
  role: { type: String, enum: ['admin', 'medecin'], default: 'medecin' }
});

const patientSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  dateNaissance: { type: Date, required: true },
  telephone: { type: String, required: true },
  email: { type: String, required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const appointmentSchema = new mongoose.Schema({
  patient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Patient', 
    required: true 
  },
  doctor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  date: { 
    type: Date, 
    required: true 
  },
  heure: { 
    type: String, 
    required: true 
  },
  motif: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['planifié', 'terminé', 'annulé'],
    default: 'planifié'
  }
}, {
  timestamps: true
});

const attachmentSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  mimetype: String,
  size: Number,
  uploadDate: { type: Date, default: Date.now }
});

const medicalRecordSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  diagnostic: { type: String, required: true },
  prescription: { type: String, required: true },
  notes: String,
  attachments: [attachmentSchema]
});

const User = mongoose.model('User', userSchema);
const Patient = mongoose.model('Patient', patientSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);
const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: '"Cabinet Médical" <noreply@cabinet-medical.com>',
      to,
      subject,
      html
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Multer Configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = 'uploads';
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté'));
    }
  }
});

// Middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);
    
    if (!user) throw new Error();
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Veuillez vous authentifier.' });
  }
};

const adminAuth = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès non autorisé' });
  }
  next();
};

// Express App Setup
const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb+srv://mounirnachit:Ai8W9rq1nK89VGFN@cluster-medical.eoezo.mongodb.net/medical-app')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

  app.get('/ping', (req, res) => {
    res.status(200).send('Server is live');
  });

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la connexion' });
  }
});

// User Routes
app.get('/api/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs' });
  }
});

app.post('/api/users', auth, adminAuth, async (req, res) => {
  try {
    const { email, password, nom, prenom, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    const user = new User({
      email,
      password,
      nom,
      prenom,
      role
    });

    await user.save();
    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;
    
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de la création de l\'utilisateur' });
  }
});

app.put('/api/users/:id', auth, async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.role;

    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la modification de l\'utilisateur' });
  }
});

app.delete('/api/users/:id', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'utilisateur' });
  }
});

// Patient Routes with Email Confirmation
app.post('/api/patients', auth, async (req, res) => {
  try {
    const patient = new Patient({
      ...req.body,
      doctor: req.user.id
    });
    await patient.save();

    // Send welcome email
    try {
      const emailHtml = `
        <h2>Bienvenue ${patient.prenom} ${patient.nom}</h2>
        <p>Votre compte patient a été créé avec succès dans notre cabinet médical.</p>
        <p>Informations enregistrées :</p>
        <ul>
          <li>Nom : ${patient.nom}</li>
          <li>Prénom : ${patient.prenom}</li>
          <li>Email : ${patient.email}</li>
          <li>Téléphone : ${patient.telephone}</li>
        </ul>
        <p>Votre médecin traitant pourra maintenant suivre votre dossier médical en toute sécurité.</p>
        <p>Si vous n'êtes pas à l'origine de cette inscription, veuillez nous contacter immédiatement.</p>
        <p>Cordialement,<br>L'équipe du Cabinet Médical</p>
      `;

      await sendEmail(
        patient.email,
        'Bienvenue au Cabinet Médical',
        emailHtml
      );

      patient.emailConfirmed = true;
      await patient.save();
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Continue with the response even if email fails
    }

    res.status(201).json(patient);
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de la création du patient' });
  }
});

// Patient Routes
app.get('/api/patients', auth, async (req, res) => {
  try {
    const patients = await Patient.find({ doctor: req.user.id });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des patients' });
  }
});

app.post('/api/patients', auth, async (req, res) => {
  try {
    const patient = new Patient({
      ...req.body,
      doctor: req.user.id
    });
    await patient.save();
    res.status(201).json(patient);
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de la création du patient' });
  }
});

app.put('/api/patients/:id', auth, async (req, res) => {
  try {
    const patient = await Patient.findOneAndUpdate(
      { _id: req.params.id, doctor: req.user.id },
      { $set: req.body },
      { new: true }
    );

    if (!patient) {
      return res.status(404).json({ message: 'Patient non trouvé' });
    }

    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la modification du patient' });
  }
});

app.delete('/api/patients/:id', auth, async (req, res) => {
  try {
    const patient = await Patient.findOneAndDelete({
      _id: req.params.id,
      doctor: req.user.id
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient non trouvé' });
    }

    res.json({ message: 'Patient supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression du patient' });
  }
});
// Endpoint for manually sending confirmation email
app.post('/api/patients/:id/send-confirmation', auth, async (req, res) => {
  try {
    const patient = await Patient.findOne({
      _id: req.params.id,
      doctor: req.user.id
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient non trouvé' });
    }

    const emailHtml = `
      <h2>Bienvenue ${patient.prenom} ${patient.nom}</h2>
      <p>Votre compte patient a été créé avec succès dans notre cabinet médical.</p>
      <p>Informations enregistrées :</p>
      <ul>
        <li>Nom : ${patient.nom}</li>
        <li>Prénom : ${patient.prenom}</li>
        <li>Email : ${patient.email}</li>
        <li>Téléphone : ${patient.telephone}</li>
      </ul>
      <p>Votre médecin traitant pourra maintenant suivre votre dossier médical en toute sécurité.</p>
      <p>Si vous n'êtes pas à l'origine de cette inscription, veuillez nous contacter immédiatement.</p>
      <p>Cordialement,<br>L'équipe du Cabinet Médical</p>
    `;

    await sendEmail(
      patient.email,
      'Bienvenue au Cabinet Médical',
      emailHtml
    );

    patient.emailConfirmed = true;
    await patient.save();

    res.json({ message: 'Email de confirmation envoyé avec succès' });
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email de confirmation' });
  }
});
// Appointment Routes
app.get('/api/appointments', auth, async (req, res) => {
  try {
    const appointments = await Appointment.find({ doctor: req.user.id })
      .populate('patient')
      .sort({ date: 1 });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des rendez-vous' });
  }
});

app.post('/api/appointments', auth, async (req, res) => {
  try {
    const appointment = new Appointment({
      ...req.body,
      doctor: req.user.id
    });
    await appointment.save();
    const populatedAppointment = await appointment.populate('patient');
    res.status(201).json(populatedAppointment);
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de la création du rendez-vous' });
  }
});

app.put('/api/appointments/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, doctor: req.user.id },
      { $set: req.body },
      { new: true }
    ).populate('patient');

    if (!appointment) {
      return res.status(404).json({ message: 'Rendez-vous non trouvé' });
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la modification du rendez-vous' });
  }
});

app.delete('/api/appointments/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndDelete({
      _id: req.params.id,
      doctor: req.user.id
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Rendez-vous non trouvé' });
    }

    res.json({ message: 'Rendez-vous supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression du rendez-vous' });
  }
});

// Medical Records Routes
app.get('/api/medical-records/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const patient = await Patient.findOne({
      _id: patientId,
      doctor: req.user.id
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient non trouvé' });
    }

    const records = await MedicalRecord.find({
      patientId,
      doctor: req.user.id
    }).sort({ date: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des dossiers médicaux' });
  }
});

app.post('/api/medical-records/:patientId', auth, upload.array('attachments'), async (req, res) => {
  try {
    const { patientId } = req.params;
    const patient = await Patient.findOne({
      _id: patientId,
      doctor: req.user.id
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient non trouvé' });
    }

    const attachments = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    })) : [];

    const record = new MedicalRecord({
      ...req.body,
      patientId,
      doctor: req.user.id,
      attachments
    });

    await record.save();
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de la création du dossier médical' });
  }
});

// Initial Admin Setup
const createInitialAdmin = async () => {
  try {
    const adminExists = await User.findOne({ email: 'admin@example.com' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        email: 'admin@example.com',
        password: hashedPassword,
        nom: 'Admin',
        prenom: 'User',
        role: 'admin'
      });
      console.log('Initial admin user created');
    }
  } catch (error) {
    console.error('Error creating initial admin:', error);
  }
};

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  createInitialAdmin();
});