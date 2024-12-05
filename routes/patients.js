import express from 'express';
import { Patient } from '../models/patient.js';
import { auth } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de patient invalide' });
    }

    const patient = await Patient.findOne({ 
      _id: id,
      doctor: req.user.id 
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient non trouvé' });
    }

    // Mise à jour du patient avec les nouvelles données
    const updatedPatient = await Patient.findByIdAndUpdate(
      id,
      {
        $set: {
          ...req.body,
          doctor: req.user.id
        }
      },
      { 
        new: true,
        runValidators: true
      }
    );

    res.json(updatedPatient);
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ message: 'Erreur lors de la modification du patient' });
  }
});