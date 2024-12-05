import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import axios from 'axios';

interface Patient {
  _id: string;
  nom: string;
  prenom: string;
}

interface Appointment {
  _id: string;
  patient: Patient | null;
  date: string;
  heure: string;
  motif: string;
}

const Appointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    patient: '',
    date: '',
    heure: '',
    motif: '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/appointments', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setAppointments(response.data);
    } catch (error) {
      console.error('Erreur lors de :', error);
      setMessage('Erreur lors de ');
    }
  };

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/patients', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setPatients(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des patients:', error);
      setMessage('Erreur lors de la récupération des patients');
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
  }, []);

  const handleTimeChange = (time: string) => {
    const [hours] = time.split(':').map(Number);
    if (hours >= 8 && hours < 18) {
      setTimeError(null);
      setFormData({ ...formData, heure: time });
    } else {
      setTimeError('Les rendez-vous sont possibles uniquement entre 8h et 18h');
      setFormData({ ...formData, heure: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const [hours] = formData.heure.split(':').map(Number);
    if (hours < 8 || hours >= 18) {
      setTimeError('Les rendez-vous sont possibles uniquement entre 8h et 18h');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/appointments',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 201) {
        setMessage('Rendez-vous ajouté avec succès');
        setShowModal(false);
        setFormData({
          patient: '',
          date: '',
          heure: '',
          motif: '',
        });
        setTimeError(null);
        fetchAppointments();
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du rendez-vous:', error);
      setMessage('Erreur lors de l\'ajout du rendez-vous');
    }
  };

  const formatPatientName = (patient: Patient | null) => {
    if (!patient) return 'Patient non disponible';
    return `${patient.nom || ''} ${patient.prenom || ''}`.trim() || 'Nom non disponible';
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Date invalide';
    }
  };

  return (
    <div className="p-6">
      {message && (
        <div className={`p-4 mb-4 rounded-md ${
          message.includes('succès') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Rendez-vous</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Rendez-vous
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Heure
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Motif
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {appointments.map((appointment) => (
              <tr key={appointment._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {formatPatientName(appointment.patient)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {formatDate(appointment.date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {appointment.heure || 'Heure non spécifiée'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {appointment.motif || 'Aucun motif'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                Ajouter un nouveau rendez-vous
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Patient</label>
                  <select
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.patient}
                    onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                    required
                  >
                    <option value="">Sélectionner un patient</option>
                    {patients.map((patient) => (
                      <option key={patient._id} value={patient._id}>
                        {`${patient.nom} ${patient.prenom}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    min={today}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Heure (8h-18h)</label>
                  <input
                    type="time"
                    className={`mt-1 block w-full px-3 py-2 border ${
                      timeError ? 'border-red-500' : 'border-gray-300'
                    } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                    value={formData.heure}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    min="08:00"
                    max="18:00"
                    step="900"
                    required
                  />
                  {timeError && (
                    <p className="mt-1 text-sm text-red-600">{timeError}</p>
                  )}
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Motif</label>
                  <input
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.motif}
                    onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                    required
                  />
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Ajouter
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;