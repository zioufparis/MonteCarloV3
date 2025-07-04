import React, { useState } from "react";

const AuthGate = ({ onAuthenticated }) => {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = () => {
    setIsSubmitting(true);
    setError("");

    // Validation simple
    if (!email || !firstName) {
      setError("Veuillez remplir tous les champs");
      setIsSubmitting(false);
      return;
    }

    if (!email.includes("@")) {
      setError("Email invalide");
      setIsSubmitting(false);
      return;
    }

    try {
      // Sauvegarder les infos utilisateur
      const userData = {
        email,
        firstName,
        timestamp: new Date().toISOString(),
        id: Date.now().toString(),
      };

      // Stocker dans localStorage (temporaire)
      const existingUsers = JSON.parse(
        localStorage.getItem("simulateur-users") || "[]"
      );

      // Vérifier si l'utilisateur existe déjà
      const existingUser = existingUsers.find((user) => user.email === email);

      if (!existingUser) {
        existingUsers.push(userData);
        localStorage.setItem("simulateur-users", JSON.stringify(existingUsers));
      }

      // Marquer comme authentifié
      localStorage.setItem(
        "simulateur-authenticated",
        JSON.stringify(userData)
      );

      onAuthenticated(userData);
    } catch (err) {
      setError("Erreur lors de l'authentification");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            📊 Simulateur Patrimoine
          </h1>
          <p className="text-gray-600">
            Accédez à votre simulation Monte Carlo personnalisée
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prénom
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Votre prénom"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="votre@email.com"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isSubmitting ? "Connexion..." : "Accéder au simulateur"}
          </button>
        </div>

        <div className="mt-6 text-xs text-gray-500 text-center">
          Vos données sont utilisées uniquement pour l'accès au simulateur
        </div>
      </div>
    </div>
  );
};

export default AuthGate;
