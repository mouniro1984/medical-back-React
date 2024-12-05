import React, { useState, useEffect } from 'react';
import { Users, Calendar, Clock, Plus } from 'lucide-react';
import axios from 'axios';

interface Patient {
  _id: string;
  nom: string;
  prenom: string;
}

interface Appointment {
  _id: string;
  patient: Patient;
  date: string;
  heure: string;
  motif: string;
}

const Dashboard = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    patient: '',
    date: '',
    heure: '',
    motif: ''
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = {
          'Authorization': `Bearer ${token}`
        };

        const [patientsRes, appointmentsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/patients', { headers }),
          axios.get('http://localhost:5000/api/appointments', { headers })
        ]);

        setPatients(patientsRes.data);
        setAppointments(appointmentsRes.data);
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/appointments',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 201) {
        setMessage('Rendez-vous ajouté avec succès');
        setShowModal(false);
        setAppointments([...appointments, response.data]);
        setFormData({
          patient: '',
          date: '',
          heure: '',
          motif: ''
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du rendez-vous:', error);
      setMessage('Une erreur est survenue lors de l\'ajout du rendez-vous');
    }
  };

  const getTodayAppointments = () => {
    const today = new Date().toISOString().split('T')[0];
    return appointments.filter(apt => apt.date.split('T')[0] === today);
  };

  const getNextAppointment = () => {
    const now = new Date();
    return appointments
      .filter(apt => new Date(apt.date) > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  };

  const formatDateTime = (date: string, time: string) => {
    const dateObj = new Date(date);
    return `${dateObj.toLocaleDateString()} à ${time}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {message && (
        <div className={`mb-6 p-4 rounded-lg shadow-sm border-l-4 ${
          message.includes('succès') 
            ? 'bg-green-50 border-green-500 text-green-700' 
            : 'bg-red-50 border-red-500 text-red-700'
        }`}>
          {message}
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transform transition-all duration-200 hover:scale-105 shadow-md"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nouveau Rendez-vous
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-900">Total Patients</h2>
              <p className="text-3xl font-bold text-blue-600 mt-2">{patients.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-900">RDV Aujourd'hui</h2>
              <p className="text-3xl font-bold text-green-600 mt-2">{getTodayAppointments().length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-900">Prochain RDV</h2>
              {getNextAppointment() ? (
                <div className="mt-2">
                  <p className="text-purple-600 font-bold">
                    {formatDateTime(getNextAppointment().date, getNextAppointment().heure)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {getNextAppointment().patient.nom} {getNextAppointment().patient.prenom}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mt-2">Aucun rendez-vous prévu</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Prochains Rendez-vous
          </h2>
          <div className="divide-y divide-gray-100">
            {appointments.length > 0 ? (
              appointments
                .filter(apt => new Date(apt.date) > new Date())
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 5)
                .map(appointment => (
                  <div key={appointment._id} className="py-4 flex justify-between items-center hover:bg-gray-50 rounded-lg px-4 transition-colors duration-200">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {appointment.patient.nom} {appointment.patient.prenom}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDateTime(appointment.date, appointment.heure)}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                        {appointment.motif}
                      </span>
                    </div>
                  </div>
                ))
            ) : (
              <p className="py-4 text-gray-500 text-center">
                Aucun rendez-vous à venir
              </p>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-8 border w-full max-w-md shadow-xl rounded-xl bg-white">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Nouveau Rendez-vous
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Remplissez les informations pour créer un nouveau rendez-vous
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Patient</label>
                <select
                  value={formData.patient}
                  onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="">Sélectionnez un patient</option>
                  {patients.map(patient => (
                    <option key={patient._id} value={patient._id}>
                      {patient.nom} {patient.prenom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Heure</label>
                <input
                  type="time"
                  value={formData.heure}
                  onChange={(e) => setFormData({ ...formData, heure: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Motif</label>
                <input
                  type="text"
                  value={formData.motif}
                  onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;