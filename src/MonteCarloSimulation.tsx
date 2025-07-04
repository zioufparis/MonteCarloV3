import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
// À ajouter dans les imports (généralement en haut du fichier)
import * as XLSX from "xlsx";
import AuthGate from "./AuthGate"; // ou le chemin vers votre composant
const Simulateur = () => {
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState<any>({});
  const [ruinProbability, setRuinProbability] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  // États pour la sauvegarde et l'export
  const [savedConfigs, setSavedConfigs] = useState([]);
  const [configName, setConfigName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [finalAllocations, setFinalAllocations] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [stressTestResults, setStressTestResults] = useState({});
  const [showStressTest, setShowStressTest] = useState(false);
  const [isStressTestLoading, setIsStressTestLoading] = useState(false);
  // Charger les configurations sauvegardées au démarrage
  useEffect(() => {
    const saved = JSON.parse(
      localStorage.getItem("simulateur-configs") || "[]"
    );
    setSavedConfigs(saved);

    // Vérifier l'authentication existante
    const authData = localStorage.getItem("simulateur-authenticated");
    if (authData) {
      try {
        const userData = JSON.parse(authData);
        setCurrentUser(userData);
        setIsAuthenticated(true);
      } catch (err) {
        localStorage.removeItem("simulateur-authenticated");
      }
    }
  }, []);

  // Sauvegarder une configuration
  const saveConfiguration = () => {
    if (!configName.trim()) return;

    const newConfig = {
      id: Date.now(),
      name: configName,
      parameters: { ...parameters },
      date: new Date().toLocaleDateString("fr-FR"),
    };

    const updatedConfigs = [...savedConfigs, newConfig];
    setSavedConfigs(updatedConfigs);
    localStorage.setItem("simulateur-configs", JSON.stringify(updatedConfigs));

    setConfigName("");
    setShowSaveDialog(false);
  };

  // Charger une configuration
  const loadConfiguration = (config) => {
    setParameters(config.parameters);
  };

  // Supprimer une configuration
  const deleteConfiguration = (configId) => {
    const updatedConfigs = savedConfigs.filter((c) => c.id !== configId);
    setSavedConfigs(updatedConfigs);
    localStorage.setItem("simulateur-configs", JSON.stringify(updatedConfigs));
  };

  // Exporter les résultats
  // Exporter les résultats en Excel
  const exportResults = () => {
    // Préparer les données pour l'export Excel
    const worksheetData = [
      // En-têtes
      [
        "Mois",
        "Date",
        "Patrimoine Début",
        "Rendement Mensuel",
        "Contribution",
        "Patrimoine Fin",
        "% Variation",
      ],
      // Données de la timeline
      ...timelineData.map((item, index) => [
        index + 1,
        item.dateLabel,
        item.valueStart,
        item.monthlyReturn,
        item.contribution,
        item.valueEnd,
        item.returnRate / 100, // Excel préfère les pourcentages en décimal
      ]),
    ];

    // Ajouter une feuille séparée avec les statistiques
    const statsData = [
      ["Statistiques de la Simulation", ""],
      ["", ""],
      ["Paramètres", ""],
      ["Patrimoine Initial", parameters.initialValue],
      ["Horizon (années)", parameters.timeHorizon],
      ["Épargne Mensuelle", parameters.monthlyContribution],
      ["", ""],
      ["Résultats", ""],
      ["Médiane Finale", stats.median],
      ["Moyenne Finale", stats.mean],
      ["Écart-type", stats.standardDeviation],
      ["Minimum", stats.min],
      ["Maximum", stats.max],
      ["", ""],
      ["Analyses Avancées", ""],
      ["Ratio de Sharpe", stats.advancedAnalytics?.sharpeRatio || "N/A"],
      [
        "Drawdown Maximum (%)",
        stats.advancedAnalytics?.maxDrawdown * 100 || "N/A",
      ],
      ["CAGR Moyen (%)", stats.advancedAnalytics?.cagr * 100 || "N/A"],
      ["Ratio de Sortino", stats.advancedAnalytics?.sortinoRatio || "N/A"],
      ["", ""],
      ["Coast FIRE", ""],
      ["Seuil Coast FIRE", stats.coastFIRE?.coastFIREAmount || "N/A"],
      [
        "Objectif Atteint",
        stats.coastFIRE?.hasReachedCoastFIRE ? "Oui" : "Non",
      ],
      ["Écart/Surplus", stats.coastFIRE?.gapAmount || "N/A"],
    ];

    // Créer le workbook Excel
    const wb = XLSX.utils.book_new();

    // Feuille 1: Timeline détaillée
    const ws1 = XLSX.utils.aoa_to_sheet(worksheetData);

    // Formater les colonnes monétaires
    const range = XLSX.utils.decode_range(ws1["!ref"]);
    for (let R = 1; R <= range.e.r; R++) {
      // Colonnes C, D, E, F (patrimoine, rendement, contribution, patrimoine fin)
      ["C", "D", "E", "F"].forEach((col) => {
        const cellAddress = col + (R + 1);
        if (ws1[cellAddress]) {
          ws1[cellAddress].z = '"€"#,##0';
        }
      });
      // Colonne G (pourcentage)
      const cellG = "G" + (R + 1);
      if (ws1[cellG]) {
        ws1[cellG].z = "0.00%";
      }
    }

    // Feuille 2: Statistiques
    const ws2 = XLSX.utils.aoa_to_sheet(statsData);

    // Ajouter les feuilles au workbook
    XLSX.utils.book_append_sheet(wb, ws1, "Timeline Détaillée");
    XLSX.utils.book_append_sheet(wb, ws2, "Statistiques");

    // Télécharger le fichier
    const fileName = `simulation-patrimoine-${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    XLSX.writeFile(wb, fileName);
  };
  const [activeTab, setActiveTab] = useState("evolution");
  const [parameters, setParameters] = useState({
    initialValue: 300000,
    timeHorizon: 30,
    monthlyContribution: 500,
    simulations: 5000,
    // Nouveaux paramètres avancés
    inflation: 0.025, // 2.5% par an
    taxRate: 0.3, // 30% sur les plus-values
    rebalancingFrequency: 12, // Tous les 12 mois (1 = mensuel, 12 = annuel, 0 = jamais)
    realEstate: { allocation: 0.42, return: 0.035, volatility: 0.12 },
    stocks: { allocation: 0.34, return: 0.05, volatility: 0.18 },
    crypto: { allocation: 0.13, return: 0.1, volatility: 0.45 },
    cash: { allocation: 0.06, return: -0.02, volatility: 0.02 },
    other: { allocation: 0.05, return: 0.02, volatility: 0.08 },
    // Paramètres Coast FIRE
    currentAge: 30,
    retirementAge: 65,
    retirementGoal: 1000000,
    // Phase accumulation / consommation
    accumulationYears: 10, // par défaut : 10 ans d’épargne
    consumptionYears: 20, // puis 20 ans de consommation
    monthlyWithdrawal: 1500, // montant retiré chaque mois pendant la retraite
    monthlyWithdrawalAllocation: {
      realEstate: 0.3,
      stocks: 0.5,
      crypto: 0.1,
      cash: 0.05,
      other: 0.05,
    },

   
    currentSavings: 300000, // Utilise initialValue par défaut
    // Nouvelle répartition des versements mensuels (allocation des contributions)
    monthlyAllocation: {
      realEstate: 0.5,
      stocks: 0.5,
      crypto: 0,
      cash: 0,
      other: 0,
    },
  });
  // Scénarios prédéfinis
  const presetScenarios = {
    conservateur: {
      name: "🛡️ Conservateur",
      description: "Faible risque, rendements stables",
      realEstate: { allocation: 0.3, return: 0.025, volatility: 0.08 },
      stocks: { allocation: 0.2, return: 0.04, volatility: 0.12 },
      crypto: { allocation: 0.02, return: 0.08, volatility: 0.35 },
      cash: { allocation: 0.35, return: -0.015, volatility: 0.01 },
      other: { allocation: 0.13, return: 0.02, volatility: 0.05 },
      rebalancingFrequency: 6,
    },
    equilibre: {
      name: "⚖️ Équilibré",
      description: "Équilibre risque/rendement",
      realEstate: { allocation: 0.42, return: 0.035, volatility: 0.12 },
      stocks: { allocation: 0.34, return: 0.05, volatility: 0.18 },
      crypto: { allocation: 0.13, return: 0.1, volatility: 0.45 },
      cash: { allocation: 0.06, return: -0.02, volatility: 0.02 },
      other: { allocation: 0.05, return: 0.02, volatility: 0.08 },
      rebalancingFrequency: 12,
    },
    agressif: {
      name: "🚀 Agressif",
      description: "Risque élevé, potentiel de rendement maximal",
      realEstate: { allocation: 0.25, return: 0.04, volatility: 0.15 },
      stocks: { allocation: 0.5, return: 0.065, volatility: 0.22 },
      crypto: { allocation: 0.2, return: 0.12, volatility: 0.55 },
      cash: { allocation: 0.02, return: -0.025, volatility: 0.01 },
      other: { allocation: 0.03, return: 0.025, volatility: 0.1 },
      rebalancingFrequency: 12,
    },
  } as const;

  type ScenarioKey = keyof typeof presetScenarios;

  const applyPresetScenario = (scenarioKey: ScenarioKey) => {
    const scenario = presetScenarios[scenarioKey];
    setParameters((prev) => ({
      ...prev,
      realEstate: scenario.realEstate,
      stocks: scenario.stocks,
      crypto: scenario.crypto,
      cash: scenario.cash,
      other: scenario.other,
      rebalancingFrequency: scenario.rebalancingFrequency,
    }));
  };

  // Amélioration 1: Générateur de nombres normaux optimisé
  let normalCache = null;
  const normalRandom = () => {
    if (normalCache !== null) {
      const value = normalCache;
      normalCache = null;
      return value;
    }

    let u = 0,
      v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();

    const z0 = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    const z1 = Math.sqrt(-2 * Math.log(u)) * Math.sin(2 * Math.PI * v);

    normalCache = z1;
    return z0;
  };
  // Amélioration 2: Matrice de corrélation réaliste
  const DEFAULT_CORRELATION_MATRIX = {
    realEstate: {
      realEstate: 1.0,
      stocks: 0.3,
      crypto: 0.1,
      cash: -0.1,
      other: 0.2,
    },
    stocks: {
      realEstate: 0.3,
      stocks: 1.0,
      crypto: 0.4,
      cash: -0.2,
      other: 0.5,
    },
    crypto: {
      realEstate: 0.1,
      stocks: 0.4,
      crypto: 1.0,
      cash: -0.1,
      other: 0.3,
    },
    cash: {
      realEstate: -0.1,
      stocks: -0.2,
      crypto: -0.1,
      cash: 1.0,
      other: -0.1,
    },
    other: {
      realEstate: 0.2,
      stocks: 0.5,
      crypto: 0.3,
      cash: -0.1,
      other: 1.0,
    },
  };

  // Amélioration 3: Décomposition de Cholesky
  const choleskyDecomposition = (correlationMatrix) => {
    const assets = Object.keys(correlationMatrix);
    const n = assets.length;
    const L = Array(n)
      .fill(0)
      .map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        const corr = correlationMatrix[assets[i]][assets[j]];
        if (i === j) {
          const sum = L[i].slice(0, j).reduce((acc, val) => acc + val * val, 0);
          L[i][j] = Math.sqrt(Math.max(0, corr - sum));
        } else {
          const sum = L[i]
            .slice(0, j)
            .reduce((acc, val, k) => acc + val * L[j][k], 0);
          L[i][j] = L[j][j] !== 0 ? (corr - sum) / L[j][j] : 0;
        }
      }
    }

    return { L, assets };
  };

  // Amélioration 4: Génération de rendements corrélés
  const generateCorrelatedReturns = (baseReturns, volatilities, cholesky) => {
    const { L, assets } = cholesky;
    const independentRandom = assets.map(() => normalRandom());
    const correlatedReturns = {};

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      let correlatedValue = 0;
      for (let j = 0; j <= i; j++) {
        correlatedValue += L[i][j] * independentRandom[j];
      }
      correlatedReturns[asset] =
        baseReturns[asset] + correlatedValue * volatilities[asset];
    }

    return correlatedReturns;
  };

  // Amélioration 5: Inflation stochastique
  const generateInflationRate = (baseInflation, volatility = 0.008) => {
    return baseInflation + normalRandom() * volatility;
  };
  // 1. Fonction pour calculer les analyses avancées
  // À ajouter après votre fonction normalRandom()
  const applyStressTest = (crisisKey, parameters, historicalCrises) => {
    const crisis = historicalCrises[crisisKey];
    const stressParameters = { ...parameters };

    Object.keys(crisis.impacts).forEach((asset) => {
      if (stressParameters[asset]) {
        stressParameters[asset] = {
          ...stressParameters[asset],
          return: stressParameters[asset].return, // Ne pas modifier le rendement
          volatility: stressParameters[asset].volatility * 1.5, // Augmenter la volatilité
        };
      }
    });

    return stressParameters;
  };

  const runSingleStressSimulation = (stressParams, crisisKey) => {
    const crisis = historicalCrises[crisisKey];

    const simulations = 1000;
    const finalValues = [];

    const maxStart = stressParams.timeHorizon * 12 - crisis.duration;
    const crisisStartMonth = Math.floor(Math.random() * maxStart);
    const crisisEndMonth = crisisStartMonth + crisis.duration;

    for (let sim = 0; sim < simulations; sim++) {
      let currentValue = stressParams.initialValue;

      for (let year = 0; year < stressParams.timeHorizon; year++) {
        for (let month = 1; month <= 12; month++) {
          const totalMonths = year * 12 + month;
          const isCrisis =
            totalMonths >= crisisStartMonth && totalMonths < crisisEndMonth;

          const crisisAdjusted = (assetKey) => {
            const base = stressParams[assetKey];
            const impact = crisis.impacts[assetKey] || 0;

            const monthlyBaseReturn = base.return / 12;

            const monthlyCrisisShock = isCrisis
              ? Math.pow(1 + impact, 1 / crisis.duration) - 1
              : 0;

            const monthlyReturn = monthlyBaseReturn + monthlyCrisisShock;
            const volatility = isCrisis
              ? base.volatility * 1.5
              : base.volatility;

            return {
              monthlyReturn,
              volatility,
            };
          };

          const re = crisisAdjusted("realEstate");
          const st = crisisAdjusted("stocks");
          const cr = crisisAdjusted("crypto");
          const ca = crisisAdjusted("cash");
          const ot = crisisAdjusted("other");

          const portfolioReturn =
            stressParams.realEstate.allocation *
              (re.monthlyReturn +
                (normalRandom() * re.volatility) / Math.sqrt(12)) +
            stressParams.stocks.allocation *
              (st.monthlyReturn +
                (normalRandom() * st.volatility) / Math.sqrt(12)) +
            stressParams.crypto.allocation *
              (cr.monthlyReturn +
                (normalRandom() * cr.volatility) / Math.sqrt(12)) +
            stressParams.cash.allocation *
              (ca.monthlyReturn +
                (normalRandom() * ca.volatility) / Math.sqrt(12)) +
            stressParams.other.allocation *
              (ot.monthlyReturn +
                (normalRandom() * ot.volatility) / Math.sqrt(12));

          currentValue *= 1 + portfolioReturn;
          currentValue +=
            stressParams.monthlyContribution *
            Math.pow(1 + stressParams.inflation, year);
          currentValue = Math.max(0, currentValue);
        }
      }

      finalValues.push(currentValue);
    }

    finalValues.sort((a, b) => a - b);

    return {
      mean: finalValues.reduce((a, b) => a + b, 0) / simulations,
      median: finalValues[Math.floor(simulations * 0.5)],
      p10: finalValues[Math.floor(simulations * 0.1)],
      p90: finalValues[Math.floor(simulations * 0.9)],
      worstCase: finalValues[0],
      lossProbability:
        (finalValues.filter((v) => v < stressParams.initialValue).length /
          simulations) *
        100,
    };
  };

  const calculateAdvancedAnalytics = (
    allSimulations: any[],
    parameters: any
  ) => {
    const { timeHorizon, initialValue, inflation } = parameters;

    // Calcul du Sharpe Ratio moyen
    const sharpeRatios = allSimulations.map((simulation) => {
      const returns = [];
      for (let i = 1; i < simulation.length; i++) {
        const yearReturn =
          (simulation[i].value - simulation[i - 1].value) /
          simulation[i - 1].value;
        returns.push(yearReturn);
      }

      if (returns.length === 0) return 0;

      const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const returnStd = Math.sqrt(
        returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) /
          returns.length
      );
      const riskFreeRate = 0.02; // Taux sans risque à 2%

      return returnStd > 0 ? (meanReturn - riskFreeRate) / returnStd : 0;
    });

    const avgSharpeRatio =
      sharpeRatios.reduce((a, b) => a + b, 0) / sharpeRatios.length;

    // Calcul du Maximum Drawdown moyen
    const maxDrawdowns = allSimulations.map((simulation) => {
      let maxDrawdown = 0;
      let peak = simulation[0].value;

      for (let i = 1; i < simulation.length; i++) {
        if (simulation[i].value > peak) {
          peak = simulation[i].value;
        }
        const drawdown = (peak - simulation[i].value) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }

      return maxDrawdown;
    });

    const avgMaxDrawdown =
      maxDrawdowns.reduce((a, b) => a + b, 0) / maxDrawdowns.length;

    // Calcul du CAGR (Compound Annual Growth Rate) moyen
    const cagrs = allSimulations.map((simulation) => {
      const finalValue = simulation[simulation.length - 1].value;
      if (initialValue <= 0 || finalValue <= 0) return 0;
      return Math.pow(finalValue / initialValue, 1 / timeHorizon) - 1;
    });

    const avgCAGR = cagrs.reduce((a, b) => a + b, 0) / cagrs.length;

    // Calcul du ratio de Sortino (variation du Sharpe qui ne pénalise que la volatilité négative)
    const sortinoRatios = allSimulations.map((simulation) => {
      const returns = [];
      for (let i = 1; i < simulation.length; i++) {
        const yearReturn =
          (simulation[i].value - simulation[i - 1].value) /
          simulation[i - 1].value;
        returns.push(yearReturn);
      }

      if (returns.length === 0) return 0;

      const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const negativeReturns = returns.filter((r) => r < 0);

      if (negativeReturns.length === 0) return avgSharpeRatio; // Pas de volatilité négative

      const downwardStd = Math.sqrt(
        negativeReturns.reduce((sum, ret) => sum + Math.pow(ret, 2), 0) /
          negativeReturns.length
      );
      const riskFreeRate = 0.02;

      return downwardStd > 0 ? (meanReturn - riskFreeRate) / downwardStd : 0;
    });

    const avgSortinoRatio =
      sortinoRatios.reduce((a, b) => a + b, 0) / sortinoRatios.length;

    return {
      sharpeRatio: avgSharpeRatio,
      maxDrawdown: avgMaxDrawdown,
      cagr: avgCAGR,
      sortinoRatio: avgSortinoRatio,
    };
  };
  const calculateCoastFIRE = (parameters) => {
    const {
      currentAge,
      retirementAge,
      retirementGoal,
      currentSavings,
      inflation,
    } = parameters;

    // Calcul du rendement réel moyen pondéré du portefeuille
    const { realEstate, stocks, crypto, cash, other } = parameters;
    const portfolioRealReturn =
      realEstate.allocation * realEstate.return +
      stocks.allocation * stocks.return +
      crypto.allocation * crypto.return +
      cash.allocation * cash.return +
      other.allocation * other.return -
      inflation;

    const yearsToRetirement = retirementAge - currentAge;

    // Formule Coast FIRE
    const coastFIREAmount =
      retirementGoal / Math.pow(1 + portfolioRealReturn, yearsToRetirement);

    // Statut actuel
    const hasReachedCoastFIRE = currentSavings >= coastFIREAmount;
    const gapAmount = coastFIREAmount - currentSavings;

    // Si déjà atteint, calcul de l'âge de retraite possible
    let possibleRetirementAge = retirementAge;
    if (hasReachedCoastFIRE && portfolioRealReturn > 0) {
      const yearsNeeded =
        Math.log(retirementGoal / currentSavings) /
        Math.log(1 + portfolioRealReturn);
      possibleRetirementAge = currentAge + yearsNeeded;
    }

    return {
      coastFIREAmount,
      hasReachedCoastFIRE,
      gapAmount,
      possibleRetirementAge,
      portfolioRealReturn,
      yearsToRetirement,
    };
  };
  //Partie2
  // Simulation Monte Carlo
  // Données historiques des crises majeures
  const historicalCrises = {
    dotcom2000: {
      name: "Bulle Internet (2000-2002)",
      duration: 24, // mois
      impacts: {
        stocks: -0.45, // -45% sur les actions
        realEstate: -0.1, // -10% sur l'immobilier
        crypto: -0.6, // -60% sur crypto (extrapolé)
        cash: 0.02, // +2% sur liquidités
        other: -0.2, // -20% sur autres
      },
      recoveryTime: 60, // mois pour récupération
    },
    subprime2008: {
      name: "Crise des Subprimes (2008-2009)",
      duration: 18,
      impacts: {
        stocks: -0.55,
        realEstate: -0.35,
        crypto: -0.7,
        cash: 0.01,
        other: -0.4,
      },
      recoveryTime: 48,
    },
    covid2020: {
      name: "COVID-19 (2020)",
      duration: 6,
      impacts: {
        stocks: -0.35,
        realEstate: -0.15,
        crypto: -0.25,
        cash: 0.0,
        other: -0.25,
      },
      recoveryTime: 18,
    },
  };
  type AllocationMap = {
  realEstate: number;
  stocks: number;
  crypto: number;
  cash: number;
  other: number;
};

  const runSimulation = () => {
    const {
      initialValue,
      timeHorizon,
      monthlyContribution,
      simulations,
      inflation,
      taxRate,
      rebalancingFrequency,
    } = parameters;
    const { realEstate, stocks, crypto, cash, other } = parameters;

    const allSimulations = [];
    const finalValues = [];
    const ruinData = [];
    const timelineDetail = []; // Pour stocker les détails mensuels de la première simulation

    // Préparation des données pour la corrélation
    const cholesky = choleskyDecomposition(DEFAULT_CORRELATION_MATRIX);

    for (let sim = 0; sim < simulations; sim++) {
      const simulation = [];
      let currentValue = initialValue;
      let ruined = false;
      let ruinYear = null;

      // Allocations actuelles (pour le rebalancement)
      let currentAllocations: AllocationMap = {
        realEstate: currentValue * realEstate.allocation,
        stocks: currentValue * stocks.allocation,
        crypto: currentValue * crypto.allocation,
        cash: currentValue * cash.allocation,
        other: currentValue * other.allocation,
      };

      for (let year = 0; year <= timeHorizon; year++) {
        // Génération de l'inflation stochastique pour cette année
        const yearlyInflation = generateInflationRate(inflation);
        if (year > 0) {
          for (let month = 1; month <= 12; month++) {
            const valueBeforeReturn = currentValue;

            // Génération des rendements de base
            const baseReturns = {
              realEstate: realEstate.return / 12,
              stocks: stocks.return / 12,
              crypto: crypto.return / 12,
              cash: cash.return / 12,
              other: other.return / 12,
            };

            // Volatilités mensuelles
            const volatilities = {
              realEstate: realEstate.volatility / Math.sqrt(12),
              stocks: stocks.volatility / Math.sqrt(12),
              crypto: crypto.volatility / Math.sqrt(12),
              cash: cash.volatility / Math.sqrt(12),
              other: other.volatility / Math.sqrt(12),
            };
            let monthlyReturns: AllocationMap;

            // Génération des rendements corrélés
              monthlyReturns = generateCorrelatedReturns(
              baseReturns,
              volatilities,
              cholesky
              ) as AllocationMap;


            // Application des rendements aux allocations actuelles
            currentAllocations.realEstate *= 1 + monthlyReturns.realEstate;
            currentAllocations.stocks *= 1 + monthlyReturns.stocks;
            currentAllocations.crypto *= 1 + monthlyReturns.crypto;
            currentAllocations.cash *= 1 + monthlyReturns.cash;
            currentAllocations.other *= 1 + monthlyReturns.other;
            const valueAfterReturn = Object.values(currentAllocations).reduce(
              (sum, val) => sum + val,
              0
            );
            const monthlyReturn = valueAfterReturn - valueBeforeReturn;

            currentValue = valueAfterReturn;
            // Ajout de la contribution mensuelle (ajustée pour l'inflation)
            const totalYears =
              parameters.accumulationYears + parameters.consumptionYears;

            // Retraits (négatif par défaut)

            // Ajuster pour l'inflation
            const totalMonths = year * 12 + month;
            const currentPhaseContribution =
              totalMonths < parameters.accumulationYears * 12
                ? parameters.monthlyContribution
                : -parameters.monthlyWithdrawal;

            const inflationAdjustedContribution =
              currentPhaseContribution * Math.pow(1 + yearlyInflation, year);

            currentValue += inflationAdjustedContribution;
            // Répartition de la contribution mensuelle selon allocation mensuelle définie
            const allocationMap =
              totalMonths < parameters.accumulationYears * 12
                ? parameters.monthlyAllocation
                : parameters.monthlyWithdrawalAllocation;

            currentAllocations.realEstate +=
              inflationAdjustedContribution * allocationMap.realEstate;
            currentAllocations.stocks +=
              inflationAdjustedContribution * allocationMap.stocks;
            currentAllocations.crypto +=
              inflationAdjustedContribution * allocationMap.crypto;
            currentAllocations.cash +=
              inflationAdjustedContribution * allocationMap.cash;
            currentAllocations.other +=
              inflationAdjustedContribution * allocationMap.other;

            // Enregistrement des détails pour la première simulation uniquement
            if (sim === 0) {
              const totalMonths = year * 12 + month;
              const accumulationMonths = parameters.accumulationYears * 12;

              const phase =
                totalMonths < accumulationMonths
                  ? "accumulation"
                  : "consumption";

              timelineDetail.push({
                year,
                month,
                phase,
                date: `${year}-${month.toString().padStart(2, "0")}`,
                dateLabel: `Année ${year}, Mois ${month}`,
                valueStart: valueBeforeReturn,
                monthlyReturn: monthlyReturn,
                contribution: inflationAdjustedContribution,
                valueEnd: currentValue,
                returnRate:
                  valueBeforeReturn > 0
                    ? (monthlyReturn / valueBeforeReturn) * 100
                    : 0,
              });
            }

            // Rebalancement si nécessaire
            if (
              rebalancingFrequency > 0 &&
              month % rebalancingFrequency === 0
            ) {
              // Calcul des plus-values imposables lors du rebalancement
              const initialTotalValue =
                initialValue * Math.pow(1 + inflation, year);
              let taxableGains = Math.max(0, currentValue - initialTotalValue);

              // Application de la fiscalité sur les plus-values
              if (taxableGains > 0) {
                const taxes = taxableGains * taxRate;
                currentValue -= taxes;
              }

              // Rebalancement selon les allocations cibles
              currentAllocations = {
                realEstate: currentValue * realEstate.allocation,
                stocks: currentValue * stocks.allocation,
                crypto: currentValue * crypto.allocation,
                cash: currentValue * cash.allocation,
                other: currentValue * other.allocation,
              };
            }

            // Vérification de ruine
            if (currentValue <= 0 && !ruined) {
              ruined = true;
              ruinYear = year + month / 12;
            }
          }
        }

        simulation.push({
          year,
          value: Math.max(0, currentValue),
          realValue: Math.max(
            0,
            currentValue / Math.pow(1 + yearlyInflation, year)
          ), // Valeur réelle (pouvoir d'achat)
          simulation: sim,
          allocations: { ...currentAllocations }, // 👈
        });
      }

      allSimulations.push(simulation);
      finalValues.push(currentValue);
      ruinData.push({ ruined, ruinYear });
    }

    // Calcul des percentiles pour chaque année (valeurs nominales et réelles)
    const chartData = [];
    for (let year = 0; year <= timeHorizon; year++) {
      const yearValues = allSimulations
        .map((sim) => sim[year].value)
        .sort((a, b) => a - b);
      const yearRealValues = allSimulations
        .map((sim) => sim[year].realValue)
        .sort((a, b) => a - b);

      chartData.push({
        year,
        p10: yearValues[Math.floor(simulations * 0.1)],
        p25: yearValues[Math.floor(simulations * 0.25)],
        p50: yearValues[Math.floor(simulations * 0.5)],
        p75: yearValues[Math.floor(simulations * 0.75)],
        p90: yearValues[Math.floor(simulations * 0.9)],
        mean: yearValues.reduce((a, b) => a + b, 0) / simulations,
        // Valeurs réelles (pouvoir d'achat)
        realP10: yearRealValues[Math.floor(simulations * 0.1)],
        realP25: yearRealValues[Math.floor(simulations * 0.25)],
        realP50: yearRealValues[Math.floor(simulations * 0.5)],
        realP75: yearRealValues[Math.floor(simulations * 0.75)],
        realP90: yearRealValues[Math.floor(simulations * 0.9)],
        realMean: yearRealValues.reduce((a, b) => a + b, 0) / simulations,
      });
    }

    // Statistiques finales
    finalValues.sort((a, b) => a - b);
    const finalRealValues = finalValues
      .map((v) => v / Math.pow(1 + inflation, timeHorizon))
      .sort((a, b) => a - b);

    const finalStats = {
      mean: finalValues.reduce((a, b) => a + b, 0) / simulations,
      median: finalValues[Math.floor(simulations * 0.5)],
      p10: finalValues[Math.floor(simulations * 0.1)],
      p90: finalValues[Math.floor(simulations * 0.9)],
      worstCase: finalValues[0],
      bestCase: finalValues[finalValues.length - 1],
      probabilityLoss:
        (finalValues.filter((v) => v < initialValue).length / simulations) *
        100,
      probabilityDoubling:
        (finalValues.filter((v) => v >= initialValue * 2).length /
          simulations) *
        100,
      // Valeurs réelles
      realMean: finalRealValues.reduce((a, b) => a + b, 0) / simulations,
      realMedian: finalRealValues[Math.floor(simulations * 0.5)],
      realP10: finalRealValues[Math.floor(simulations * 0.1)],
      realP90: finalRealValues[Math.floor(simulations * 0.9)],
    };

    // Calcul des probabilités de ruine par année
    const ruinProbData = [];

    for (let year = 1; year <= timeHorizon; year++) {
      const ruinedByYear = (ruinData || []).filter(
        (r): r is { ruined: boolean; ruinYear: number } =>
          r != null && r.ruined && r.ruinYear <= year
      ).length;

      ruinProbData.push({
        year,
        probability: (ruinedByYear / simulations) * 100,
      });
    }

    const advancedAnalytics = calculateAdvancedAnalytics(
      allSimulations,
      parameters
    );
    const coastFIREData = calculateCoastFIRE({
      ...parameters,
      currentSavings: parameters.initialValue,
    });

    // Fonction pour exécuter tous les stress tests
    const runStressTests = () => {
      const stressResults = {};

      Object.keys(historicalCrises).forEach((crisisKey) => {
        const stressParams = applyStressTest(
          crisisKey,
          parameters,
          historicalCrises
        );

        const stressSimulation = runSingleStressSimulation(
          stressParams,
          crisisKey
        );
        stressResults[crisisKey] = {
          ...historicalCrises[crisisKey],
          results: stressSimulation,
        };
      });

      return stressResults;
    };
    // Trouver la simulation qui donne le résultat le plus proche de la médiane
    const medianValue = finalStats.median;
    let medianSimIndex = 0;
    let smallestDifference = Math.abs(finalValues[0] - medianValue);

    for (let i = 1; i < finalValues.length; i++) {
      const difference = Math.abs(finalValues[i] - medianValue);
      if (difference < smallestDifference) {
        smallestDifference = difference;
        medianSimIndex = i;
      }
    }

    // Récupérer les allocations finales de la simulation médiane
    const medianSimulation = allSimulations[medianSimIndex];
    const finalTimePoint = medianSimulation[medianSimulation.length - 1];
    const medianFinalValue = finalTimePoint.value;

    // ✅ Vraies allocations finales issues de la simulation médiane
    const lastSimStep = medianSimulation[medianSimulation.length - 1];
    const finalAllocationsSim = lastSimStep.allocations; // 👈 on va l'ajouter dans la simulation
    console.log("➡️ Allocations finales médiane :", finalAllocationsSim);
    console.log("➡️ Valeur finale médiane :", lastSimStep.value);

    if (!finalAllocationsSim) {
      console.warn("⚠️ Aucune allocation trouvée dans la simulation médiane !");
    }

    const totalFinal = Object.values(finalAllocationsSim as AllocationMap).reduce(
  (a, b) => a + b,
  0
);

    const finalAllocPercentages = Object.fromEntries(
      Object.entries(finalAllocationsSim).map(([k, v]) => [k, (v as number) / totalFinal])

    );

    // 🔁 Met à jour ce qui est affiché
    setFinalAllocations(finalAllocPercentages);

    setRuinProbability(ruinProbData);
    setResults(chartData);
    setStats({
      ...finalStats,
      advancedAnalytics, // 👈 Ajoutez cette ligne à votre objet finalStats
      coastFIRE: coastFIREData, //
    });
    setTimelineData(timelineDetail);
  };

  useEffect(() => {
    runSimulation();
  }, [parameters]);
  const executeStressTests = async () => {
    setIsStressTestLoading(true);
    setShowStressTest(true);

    setTimeout(() => {
      const stressResults = {};
      Object.keys(historicalCrises).forEach((crisisKey) => {
        const stressParams = applyStressTest(
          crisisKey,
          parameters,
          historicalCrises
        );

        const stressSimulation = runSingleStressSimulation(
          stressParams,
          crisisKey
        );
        stressResults[crisisKey] = {
          ...historicalCrises[crisisKey],
          results: stressSimulation,
        };
      });

      setStressTestResults(stressResults);
      setIsStressTestLoading(false);
    }, 500);
  };

  // Données pour le graphique en secteurs
  const pieData = [
    {
      name: "🏠 Immobilier",
      value: parameters.realEstate.allocation * 100,
      color: "#8B5CF6",
    },
    {
      name: "📈 Actions",
      value: parameters.stocks.allocation * 100,
      color: "#3B82F6",
    },
    {
      name: "₿ Crypto",
      value: parameters.crypto.allocation * 100,
      color: "#F59E0B",
    },
    {
      name: "💰 Liquidités",
      value: parameters.cash.allocation * 100,
      color: "#10B981",
    },
    {
      name: "🔧 Autres",
      value: parameters.other.allocation * 100,
      color: "#EF4444",
    },
  ].filter((item) => item.value > 0);

  const formatEuro = (value) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  if (!isAuthenticated) {
    return (
      <AuthGate
        onAuthenticated={(userData) => {
          setCurrentUser(userData);
          setIsAuthenticated(true);
        }}
      />
    );
  }
  //Partie3
  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Simulation Monte Carlo - Évolution Patrimoine
        </h1>
        <p className="text-gray-600 mb-6">
          Analyse probabiliste de l'évolution de votre patrimoine sur{" "}
          {parameters.timeHorizon} ans
        </p>
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Scénarios Prédéfinis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(presetScenarios).map(([key, scenario]) => (
              <button
                key={key}
                onClick={() =>
                  applyPresetScenario(
                    key as "conservateur" | "equilibre" | "agressif"
                  )
                }
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left group"
              >
                <div className="font-semibold text-gray-800 mb-1">
                  {scenario.name}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {scenario.description}
                </div>
                <div className="text-xs text-gray-500">
                  Immobilier:{" "}
                  {(scenario.realEstate.allocation * 100).toFixed(0)}% •
                  Actions: {(scenario.stocks.allocation * 100).toFixed(0)}% •
                  Crypto: {(scenario.crypto.allocation * 100).toFixed(0)}%
                </div>
              </button>
            ))}
          </div>
        </div>
        {/* Section Sauvegarde et Export */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-700">
              Sauvegarde & Export
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveDialog(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
              >
                💾 Sauvegarder
              </button>
              <button
                onClick={exportResults}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-2"
              >
                📤 Exporter
              </button>
            </div>
          </div>

          {/* Configurations sauvegardées */}
          {savedConfigs.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-700 mb-3">
                Configurations sauvegardées
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {savedConfigs.map((config) => (
                  <div
                    key={config.id}
                    className="bg-white p-3 rounded-lg border border-gray-200 group hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-800 text-sm">
                          {config.name}
                        </h5>
                        <p className="text-xs text-gray-500">{config.date}</p>
                      </div>
                      <button
                        onClick={() => deleteConfiguration(config.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-all duration-200 text-sm"
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      {formatEuro(config.parameters.initialValue)} •{" "}
                      {config.parameters.timeHorizon}ans •{" "}
                      {formatEuro(config.parameters.monthlyContribution)}/mois
                    </div>
                    <button
                      onClick={() => loadConfiguration(config)}
                      className="w-full px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors duration-200"
                    >
                      Charger
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dialog de sauvegarde */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Sauvegarder la configuration
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de la configuration
                </label>
                <input
                  type="text"
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  placeholder="Ex: Portfolio Agressif 2025"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === "Enter" && saveConfiguration()}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setConfigName("");
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                >
                  Annuler
                </button>
                <button
                  onClick={saveConfiguration}
                  disabled={!configName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Onglets de navigation */}
        <div className="flex space-x-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab("evolution")}
            className={`px-4 py-2 font-medium ${
              activeTab === "evolution"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600"
            }`}
          >
            📈 Évolution
          </button>
          <button
            onClick={() => setActiveTab("allocation")}
            className={`px-4 py-2 font-medium ${
              activeTab === "allocation"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600"
            }`}
          >
            🥧 Répartition
          </button>
          <button
            onClick={() => setActiveTab("risk")}
            className={`px-4 py-2 font-medium ${
              activeTab === "risk"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600"
            }`}
          >
            ⚠️ Analyse de Risque
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`px-4 py-2 font-medium ${
              activeTab === "timeline"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600"
            }`}
          >
            📅 Timeline
          </button>
          <button
            onClick={() => setActiveTab("config")}
            className={`px-4 py-2 font-medium ${
              activeTab === "config"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600"
            }`}
          >
            ⚙️ Configuration
          </button>
          <button
            onClick={() => setActiveTab("stress")}
            className={`px-4 py-2 font-medium ${
              activeTab === "stress"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600"
            }`}
          >
            🔥 Stress Tests
          </button>
        </div>

        {/* Paramètres généraux */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Patrimoine initial (€)
            </label>
            <input
              type="number"
              value={parameters.initialValue}
              onChange={(e) =>
                setParameters({
                  ...parameters,
                  initialValue: parseInt(e.target.value),
                })
              }
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Horizon (années)
            </label>
            <input
              type="number"
              min={0}
              value={parameters.timeHorizon}
              onChange={(e) => {
                const newValue = e.target.value;
                setParameters({
                  ...parameters,
                  timeHorizon: newValue === "" ? 0 : parseInt(newValue, 10),
                });
              }}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phase d'accumulation (années)
            </label>
            <input
              type="number"
              value={parameters.accumulationYears}
              onChange={(e) =>
                setParameters({
                  ...parameters,
                  accumulationYears: parseInt(e.target.value),
                })
              }
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phase de consommation (années)
            </label>
            <input
              type="number"
              value={parameters.consumptionYears}
              onChange={(e) =>
                setParameters({
                  ...parameters,
                  consumptionYears: parseInt(e.target.value),
                })
              }
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          {parameters.accumulationYears + parameters.consumptionYears !==
            parameters.timeHorizon && (
            <div className="text-sm text-red-600 col-span-full">
              ⚠️ La somme des années d'accumulation (
              {parameters.accumulationYears}) et de consommation (
              {parameters.consumptionYears}) doit être égale à l'horizon (
              {parameters.timeHorizon} ans).
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Épargne mensuelle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Épargne mensuelle (€)
              </label>
              <input
                type="number"
                value={parameters.monthlyContribution}
                onChange={(e) =>
                  setParameters({
                    ...parameters,
                    monthlyContribution: parseInt(e.target.value),
                  })
                }
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Ex: 2700 pour épargner, -1500 pour puiser dans le patrimoine"
              />
            </div>

            {/* Retrait mensuel */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Retrait mensuel (€)
              </label>
              <input
                type="number"
                value={parameters.monthlyWithdrawal}
                onChange={(e) =>
                  setParameters({
                    ...parameters,
                    monthlyWithdrawal: parseFloat(e.target.value),
                  })
                }
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Ex: 1500 pour consommer"
              />
            </div>
          </div>
        </div>

        {/* Contenu des onglets */}
        {activeTab === "timeline" && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Timeline Détaillée - Retraits vs Rendements
            </h2>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                📊 Cette timeline montre l'évolution mois par mois basée sur la
                première simulation. Elle permet de visualiser les rendements
                mensuels et les contributions/retraits.
              </p>
            </div>

            <div className="w-full">
              {/* Graphique Timeline */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-medium mb-4">
                  Évolution Mensuelle du Patrimoine
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <>
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => `A${value.split("-")[0]}`}
                        interval="preserveStartEnd"
                      />
                      <YAxis tickFormatter={formatEuro} />
                      <Tooltip
                        labelFormatter={(value) => {
                          const item = timelineData.find(
                            (t) => t.date === value
                          );
                          return item ? item.dateLabel : value;
                        }}
                        formatter={(value, name) => {
                          if (name === "valueEnd")
                            return [formatEuro(value), "Patrimoine"];
                          return [formatEuro(value), name];
                        }}
                      />
                      {["accumulation", "consumption"].map((phaseKey) => (
                        <Line
                          key={phaseKey}
                          type="monotone"
                          dataKey={(d) =>
                            d.phase === phaseKey ? d.valueEnd : null
                          }
                          stroke={
                            phaseKey === "accumulation" ? "#10B981" : "#EF4444"
                          } // vert ou rouge
                          strokeWidth={2}
                          dot={false}
                          name={
                            phaseKey === "accumulation"
                              ? "Accumulation"
                              : "Consommation"
                          }
                          connectNulls
                        />
                      ))}
                    </LineChart>
                    <div className="flex gap-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <span className="inline-block w-4 h-2 bg-green-500 rounded-sm"></span>
                        Accumulation
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="inline-block w-4 h-2 bg-red-500 rounded-sm"></span>
                        Consommation
                      </div>
                    </div>
                       </>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  📊 Analyses Sophistiquées
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center mb-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>

                      <h3 className="font-semibold text-gray-700">
                        Ratio de Sharpe
                      </h3>
                    </div>
                    //Partie3b
                    <div className="text-2xl font-bold text-blue-600">
                      {(stats as any).advancedAnalytics &&
                      (stats as any).advancedAnalytics.sharpeRatio !== undefined
                        ? (stats as any).advancedAnalytics.sharpeRatio.toFixed(
                            2
                          )
                        : "N/A"}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {stats.advancedAnalytics?.sharpeRatio > 1
                        ? "Excellent"
                        : stats.advancedAnalytics?.sharpeRatio > 0.5
                        ? "Bon"
                        : stats.advancedAnalytics?.sharpeRatio > 0
                        ? "Acceptable"
                        : "Faible"}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                    <div className="flex items-center mb-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      <h3 className="font-semibold text-gray-700">
                        Drawdown Max
                      </h3>
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      -
                      {(stats.advancedAnalytics?.maxDrawdown * 100)?.toFixed(
                        1
                      ) || "N/A"}
                      %
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Perte maximale
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <h3 className="font-semibold text-gray-700">
                        CAGR Moyen
                      </h3>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {(stats.advancedAnalytics?.cagr * 100)?.toFixed(1) ||
                        "N/A"}
                      %
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Croissance annuelle
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                    <div className="flex items-center mb-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                      <h3 className="font-semibold text-gray-700">
                        Ratio de Sortino
                      </h3>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      {stats.advancedAnalytics?.sortinoRatio?.toFixed(2) ||
                        "N/A"}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Risque ajusté
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-2">
                    💡 Interprétation
                  </h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <strong>Sharpe :</strong> Rendement ajusté du risque (
                      {">"}1 = excellent, {">"}0.5 = bon)
                    </p>

                    <p>
                      <strong>Drawdown :</strong> Perte maximale depuis un pic
                      (plus faible = mieux)
                    </p>
                    <p>
                      <strong>CAGR :</strong> Taux de croissance annuel composé
                      moyen
                    </p>
                    <p>
                      <strong>Sortino :</strong> Comme Sharpe mais pénalise
                      uniquement la volatilité négative
                    </p>
                  </div>
                </div>
              </div>
              {/* Section Coast FIRE */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  🏖️ Analyse Coast FIRE
                </h2>

                {stats.coastFIRE && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div
                      className={`p-4 rounded-lg border-2 ${
                        stats.coastFIRE.hasReachedCoastFIRE
                          ? "bg-gradient-to-br from-green-50 to-green-100 border-green-300"
                          : "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300"
                      }`}
                    >
                      <div className="flex items-center mb-2">
                        <div
                          className={`w-3 h-3 rounded-full mr-2 ${
                            stats.coastFIRE.hasReachedCoastFIRE
                              ? "bg-green-500"
                              : "bg-orange-500"
                          }`}
                        ></div>
                        <h3 className="font-semibold text-gray-700">
                          Seuil Coast FIRE
                        </h3>
                      </div>
                      <div
                        className={`text-2xl font-bold ${
                          stats.coastFIRE.hasReachedCoastFIRE
                            ? "text-green-600"
                            : "text-orange-600"
                        }`}
                      >
                        {formatEuro(stats.coastFIRE.coastFIREAmount)}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Pour {formatEuro(parameters.retirementGoal)} à{" "}
                        {parameters.retirementAge} ans
                      </div>
                    </div>

                    <div
                      className={`p-4 rounded-lg border-2 ${
                        stats.coastFIRE.hasReachedCoastFIRE
                          ? "bg-gradient-to-br from-green-50 to-green-100 border-green-300"
                          : "bg-gradient-to-br from-red-50 to-red-100 border-red-300"
                      }`}
                    >
                      <div className="flex items-center mb-2">
                        <div
                          className={`w-3 h-3 rounded-full mr-2 ${
                            stats.coastFIRE.hasReachedCoastFIRE
                              ? "bg-green-500"
                              : "bg-red-500"
                          }`}
                        ></div>
                        <h3 className="font-semibold text-gray-700">Statut</h3>
                      </div>
                      <div
                        className={`text-xl font-bold ${
                          stats.coastFIRE.hasReachedCoastFIRE
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {stats.coastFIRE.hasReachedCoastFIRE
                          ? "✅ Atteint"
                          : "❌ Non atteint"}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {stats.coastFIRE.hasReachedCoastFIRE
                          ? "Vous pouvez arrêter d'épargner"
                          : "Continuez à épargner"}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center mb-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                        <h3 className="font-semibold text-gray-700">
                          {stats.coastFIRE.hasReachedCoastFIRE
                            ? "Surplus"
                            : "Écart"}
                        </h3>
                      </div>
                      <div
                        className={`text-2xl font-bold ${
                          stats.coastFIRE.hasReachedCoastFIRE
                            ? "text-green-600"
                            : "text-blue-600"
                        }`}
                      >
                        {stats.coastFIRE.hasReachedCoastFIRE ? "+" : ""}
                        {formatEuro(Math.abs(stats.coastFIRE.gapAmount))}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {stats.coastFIRE.hasReachedCoastFIRE
                          ? "Au-dessus du seuil"
                          : "Manquant pour Coast FIRE"}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                      <div className="flex items-center mb-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                        <h3 className="font-semibold text-gray-700">
                          Retraite possible
                        </h3>
                      </div>
                      <div className="text-2xl font-bold text-purple-600">
                        {stats.coastFIRE.possibleRetirementAge.toFixed(0)} ans
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {stats.coastFIRE.hasReachedCoastFIRE
                          ? `${(
                              parameters.retirementAge -
                              stats.coastFIRE.possibleRetirementAge
                            ).toFixed(0)} ans plus tôt`
                          : "Âge de retraite cible"}
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-2">
                    🧮 Paramètres Coast FIRE
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Âge actuel
                      </label>
                      <input
                        type="number"
                        value={parameters.currentAge}
                        onChange={(e) =>
                          setParameters({
                            ...parameters,
                            currentAge: parseInt(e.target.value) || 30,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Âge retraite
                      </label>
                      <input
                        type="number"
                        value={parameters.retirementAge}
                        onChange={(e) =>
                          setParameters({
                            ...parameters,
                            retirementAge: parseInt(e.target.value) || 65,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Objectif retraite (€)
                      </label>
                      <input
                        type="number"
                        value={parameters.retirementGoal}
                        onChange={(e) =>
                          setParameters({
                            ...parameters,
                            retirementGoal: parseInt(e.target.value) || 1000000,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rendement réel
                      </label>
                      <div className="w-full p-2 border border-gray-200 rounded-md text-sm bg-gray-100">
                        {(stats.coastFIRE?.portfolioRealReturn * 100)?.toFixed(
                          2
                        ) || "0.00"}
                        %
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Calculé automatiquement
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <strong>💡 Coast FIRE :</strong> Le montant nécessaire
                      aujourd'hui pour atteindre votre objectif retraite sans
                      épargner davantage.
                    </p>
                    <p>
                      <strong>🎯 Formule :</strong> Objectif Retraite ÷ (1 +
                      Rendement Réel)^Années =
                      {formatEuro(parameters.retirementGoal)} ÷ (1 +{" "}
                      {(
                        (stats.coastFIRE?.portfolioRealReturn || 0) * 100
                      ).toFixed(2)}
                      %)^{parameters.retirementAge - parameters.currentAge}
                    </p>
                    {stats.coastFIRE?.hasReachedCoastFIRE && (
                      <p className="text-green-600 font-medium">
                        🎉 Félicitations ! Vous avez atteint Coast FIRE. Vous
                        pouvez réduire votre épargne ou partir plus tôt à la
                        retraite.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {/* Graphique Rendements vs Contributions */}
            </div>

            {/* Statistiques détaillées */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {formatEuro(
                    timelineData.reduce((sum, t) => sum + t.monthlyReturn, 0)
                  )}
                </div>
                <div className="text-sm text-gray-600">Rendements totaux</div>
                <div className="text-xs text-green-500 mt-1">
                  Sur {parameters.timeHorizon} ans
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  {formatEuro(
                    timelineData.reduce((sum, t) => sum + t.contribution, 0)
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {parameters.monthlyContribution >= 0
                    ? "Épargne totale"
                    : "Retraits totaux"}
                </div>
                <div className="text-xs text-blue-500 mt-1">
                  {parameters.monthlyContribution >= 0
                    ? "Contributions"
                    : "Prélèvements"}
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-lg font-bold text-purple-600">
                  {timelineData.length > 0
                    ? (
                        timelineData.reduce((sum, t) => sum + t.returnRate, 0) /
                        timelineData.length
                      ).toFixed(2) + "%"
                    : "0%"}
                </div>
                <div className="text-sm text-gray-600">
                  Rendement moyen mensuel
                </div>
                <div className="text-xs text-purple-500 mt-1">
                  Base première simulation
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-lg font-bold text-orange-600">
                  {timelineData.length > 0
                    ? Math.max(
                        ...timelineData.map((t) => Math.abs(t.returnRate))
                      ).toFixed(2) + "%"
                    : "0%"}
                </div>
                <div className="text-sm text-gray-600">
                  Plus forte variation
                </div>
                <div className="text-xs text-orange-500 mt-1">
                  Mensuelle (absolue)
                </div>
              </div>
            </div>

            {/* Tableau détaillé des derniers mois */}
            <div className="mt-6 bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium">
                  Détail des 12 Derniers Mois
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Période
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Patrimoine Début
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rendement
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {parameters.monthlyContribution >= 0
                          ? "Épargne"
                          : "Retrait"}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Patrimoine Fin
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        % Variation
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {timelineData.slice(-12).map((item, index) => (
                      <tr
                        key={index}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.dateLabel}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatEuro(item.valueStart)}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            item.monthlyReturn >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {item.monthlyReturn >= 0 ? "+" : ""}
                          {formatEuro(item.monthlyReturn)}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm ${
                            parameters.monthlyContribution >= 0
                              ? "text-blue-600"
                              : "text-red-600"
                          }`}
                        >
                          {parameters.monthlyContribution >= 0 ? "+" : ""}
                          {formatEuro(item.contribution)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatEuro(item.valueEnd)}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            item.returnRate >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {item.returnRate >= 0 ? "+" : ""}
                          {item.returnRate.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {activeTab === "stress" && (
          <div>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                🔥 Tests de Résistance aux Crises Historiques
              </h2>
              <p className="text-gray-600 mb-6">
                Analysez comment votre portefeuille aurait résisté aux grandes
                crises financières du passé.
              </p>

              <div className="flex justify-center mb-6">
                <button
                  onClick={executeStressTests}
                  disabled={isStressTestLoading}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors duration-200 flex items-center gap-2"
                >
                  {isStressTestLoading
                    ? "⏳ Calcul en cours..."
                    : "🔥 Lancer les Stress Tests"}
                </button>
              </div>

              {showStressTest && Object.keys(stressTestResults).length > 0 && (
                <div className="space-y-6">
                  {Object.entries(stressTestResults).map(
                    ([crisisKey, crisis]) => {
                      const typedCrisis = crisis as { name: string };

                      return (
                      <div
                        key={crisisKey}
                        className="border border-red-200 rounded-lg p-6 bg-red-50"
                      >
                        <h3 className="text-lg font-semibold text-red-800 mb-2">
                          {crisis.name}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="bg-white p-4 rounded-lg">
                            <h4 className="font-medium text-gray-700 mb-2">
                              Impacts de la crise
                            </h4>
                            <div className="space-y-1 text-sm">
                              {Object.entries(crisis.impacts).map(
                                ([asset, impact]) => (
                                  <div
                                    key={asset}
                                    className="flex justify-between"
                                  >
                                    <span className="capitalize">
                                      {asset === "realEstate"
                                        ? "Immobilier"
                                        : asset === "stocks"
                                        ? "Actions"
                                        : asset === "cash"
                                        ? "Liquidités"
                                        : asset}
                                      :
                                    </span>
                                    <span
                                      className={
                                        impact < 0
                                          ? "text-red-600"
                                          : "text-green-600"
                                      }
                                    >
                                      {(impact * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                          <div className="bg-white p-4 rounded-lg">
                            <h4 className="font-medium text-gray-700 mb-2">
                              Caractéristiques
                            </h4>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div>Durée: {crisis.duration} mois</div>
                              <div>
                                Récupération: {crisis.recoveryTime} mois
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-medium text-gray-700 mb-3">
                            Résultats de simulation
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="text-center">
                              <div className="text-gray-500">
                                Valeur moyenne
                              </div>
                              <div className="font-semibold text-lg">
                                {formatEuro(crisis.results.mean)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-gray-500">Médiane</div>
                              <div className="font-semibold text-lg">
                                {formatEuro(crisis.results.median)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-gray-500">Pire cas</div>
                              <div className="font-semibold text-lg text-red-600">
                                {formatEuro(crisis.results.worstCase)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-gray-500">
                                Prob. de perte
                              </div>
                              <div className="font-semibold text-lg text-red-600">
                                {crisis.results.lossProbability.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === "config" && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Configuration des Classes d'Actifs
            </h2>
            {/* Répartition des versements mensuels */}
            <div className="mb-6 bg-white rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">
                🔄 Répartition des versements mensuels
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Cette répartition s'applique uniquement à l'épargne mensuelle.
                Elle peut être différente de celle du patrimoine initial.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {["realEstate", "stocks", "crypto", "cash", "other"].map(
                  (key) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {key === "realEstate"
                          ? "🏠 Immo"
                          : key === "stocks"
                          ? "📈 Actions"
                          : key === "crypto"
                          ? "₿ Crypto"
                          : key === "cash"
                          ? "💰 Liquidités"
                          : "🔧 Autres"}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={Math.round(
                          parameters.monthlyAllocation[key] * 100
                        )}
                        onChange={(e) => {
                          const updated = {
                            ...parameters.monthlyAllocation,
                            [key]: parseFloat(e.target.value) / 100,
                          };
                          setParameters({
                            ...parameters,
                            monthlyAllocation: updated,
                          });
                        }}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  )
                )}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Total:{" "}
                <span
                  className={`font-semibold ${
                    Math.abs(
                      Object.values(parameters.monthlyAllocation).reduce(
                        (a, b) => a + b,
                        0
                      ) - 1
                    ) < 0.01
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {Math.round(
                    Object.values(parameters.monthlyAllocation).reduce(
                      (a, b) => a + b,
                      0
                    ) * 100
                  )}
                  %
                </span>
                {Math.abs(
                  Object.values(parameters.monthlyAllocation).reduce(
                    (a, b) => a + b,
                    0
                  ) - 1
                ) >= 0.01 && (
                  <div className="text-xs text-red-600">
                    ⚠️ Le total doit être égal à 100%
                  </div>
                )}
              </div>
            </div>
            {/* Répartition des retraits mensuels */}
            <div className="mb-6 bg-white rounded-lg p-4 shadow-sm mt-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">
                💸 Répartition des retraits mensuels
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Cette répartition s'applique uniquement aux montants retirés
                chaque mois pendant la phase de consommation.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {["realEstate", "stocks", "crypto", "cash", "other"].map(
                  (key) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {key === "realEstate"
                          ? "🏠 Immo"
                          : key === "stocks"
                          ? "📈 Actions"
                          : key === "crypto"
                          ? "₿ Crypto"
                          : key === "cash"
                          ? "💰 Liquidités"
                          : "🔧 Autres"}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={Math.round(
                          parameters.monthlyWithdrawalAllocation[key] * 100
                        )}
                        onChange={(e) => {
                          const updated = {
                            ...parameters.monthlyWithdrawalAllocation,
                            [key]: parseFloat(e.target.value) / 100,
                          };
                          setParameters({
                            ...parameters,
                            monthlyWithdrawalAllocation: updated,
                          });
                        }}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  )
                )}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Total:{" "}
                <span
                  className={`font-semibold ${
                    Math.abs(
                      Object.values(
                        parameters.monthlyWithdrawalAllocation
                      ).reduce((a, b) => a + b, 0) - 1
                    ) < 0.01
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {Math.round(
                    Object.values(
                      parameters.monthlyWithdrawalAllocation
                    ).reduce((a, b) => a + b, 0) * 100
                  )}
                  %
                </span>
                {Math.abs(
                  Object.values(parameters.monthlyWithdrawalAllocation).reduce(
                    (a, b) => a + b,
                    0
                  ) - 1
                ) >= 0.01 && (
                  <div className="text-xs text-red-600">
                    ⚠️ Le total doit être égal à 100%
                  </div>
                )}
              </div>
            </div>

            {/* Paramètres avancés */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  💰 Inflation annuelle (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={parameters.inflation * 100}
                  onChange={(e) =>
                    setParameters({
                      ...parameters,
                      inflation: parseFloat(e.target.value) / 100,
                    })
                  }
                  className="w-full p-2 border border-blue-300 rounded-md"
                />
                <div className="text-xs text-blue-600 mt-1">
                  Impact sur le pouvoir d'achat
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  🏛️ Fiscalité plus-values (%)
                </label>
                <input
                  type="number"
                  step="1"
                  value={parameters.taxRate * 100}
                  onChange={(e) =>
                    setParameters({
                      ...parameters,
                      taxRate: parseFloat(e.target.value) / 100,
                    })
                  }
                  className="w-full p-2 border border-blue-300 rounded-md"
                />
                <div className="text-xs text-blue-600 mt-1">
                  Appliquée lors du rebalancement
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  ⚖️ Rebalancement (mois)
                </label>
                <select
                  value={parameters.rebalancingFrequency}
                  onChange={(e) =>
                    setParameters({
                      ...parameters,
                      rebalancingFrequency: parseInt(e.target.value),
                    })
                  }
                  className="w-full p-2 border border-blue-300 rounded-md"
                >
                  <option value={0}>Jamais</option>
                  <option value={1}>Mensuel</option>
                  <option value={3}>Trimestriel</option>
                  <option value={6}>Semestriel</option>
                  <option value={12}>Annuel</option>
                </select>
                <div className="text-xs text-blue-600 mt-1">
                  Fréquence de rééquilibrage du portefeuille
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Immobilier */}
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h4 className="font-medium text-gray-800 mb-3 text-center">
                  🏠 Immobilier
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Allocation (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(parameters.realEstate.allocation * 100)}
                      onChange={(e) =>
                        setParameters({
                          ...parameters,
                          realEstate: {
                            ...parameters.realEstate,
                            allocation: parseFloat(e.target.value) / 100,
                          },
                        })
                      }
                      className="w-full p-2 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Rendement (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={parameters.realEstate.return * 100}
                      onChange={(e) =>
                        setParameters({
                          ...parameters,
                          realEstate: {
                            ...parameters.realEstate,
                            return: parseFloat(e.target.value) / 100,
                          },
                        })
                      }
                      className="w-full p-2 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Volatilité (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={parameters.realEstate.volatility * 100}
                      onChange={(e) =>
                        setParameters({
                          ...parameters,
                          realEstate: {
                            ...parameters.realEstate,
                            volatility: parseFloat(e.target.value) / 100,
                          },
                        })
                      }
                      className="w-full p-2 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h4 className="font-medium text-gray-800 mb-3 text-center">
                  📈 Actions
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Allocation (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(parameters.stocks.allocation * 100)}
                      onChange={(e) =>
                        setParameters({
                          ...parameters,
                          stocks: {
                            ...parameters.stocks,
                            allocation: parseFloat(e.target.value) / 100,
                          },
                        })
                      }
                      className="w-full p-2 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Rendement (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={parameters.stocks.return * 100}
                      onChange={(e) =>
                        setParameters({
                          ...parameters,
                          stocks: {
                            ...parameters.stocks,
                            return: parseFloat(e.target.value) / 100,
                          },
                        })
                      }
                      className="w-full p-2 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Volatilité (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={parameters.stocks.volatility * 100}
                      onChange={(e) =>
                        setParameters({
                          ...parameters,
                          stocks: {
                            ...parameters.stocks,
                            volatility: parseFloat(e.target.value) / 100,
                          },
                        })
                      }
                      className="w-full p-2 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Crypto */}
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h4 className="font-medium text-gray-800 mb-3 text-center">
                  ₿ Crypto
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Allocation (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(parameters.crypto.allocation * 100)}
                      onChange={(e) =>
                        setParameters({
                          ...parameters,
                          crypto: {
                            ...parameters.crypto,
                            allocation: parseFloat(e.target.value) / 100,
                          },
                        })
                      }
                      className="w-full p-2 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Rendement (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={parameters.crypto.return * 100}
                      onChange={(e) =>
                        setParameters({
                          ...parameters,
                          crypto: {
                            ...parameters.crypto,
                            return: parseFloat(e.target.value) / 100,
                          },
                        })
                      }
                      className="w-full p-2 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Volatilité (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={parameters.crypto.volatility * 100}
                      onChange={(e) =>
                        setParameters({
                          ...parameters,
                          crypto: {
                            ...parameters.crypto,
                            volatility: parseFloat(e.target.value) / 100,
                          },
                        })
                      }
                      className="w-full p-2 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Liquidités */}
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h4 className="font-medium text-gray-800 mb-3 text-center">
                  💰 Liquidités
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Allocation (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(parameters.cash.allocation * 100)}
                      onChange={(e) =>
                        setParameters({
                          ...parameters,
                          cash: {
                            ...parameters.cash,
                            allocation: parseFloat(e.target.value) / 100,
                          },
                        })
                      }
                      className="w-full p-2 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Rendement (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={parameters.cash.return * 100}
                      onChange={(e) =>
                        setParameters({
                          ...parameters,
                          cash: {
                            ...parameters.cash,
                            return: parseFloat(e.target.value) / 100,
                          },
                        })
                      }
                      className="w-full p-2 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Volatilité (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={parameters.cash.volatility * 100}
                      onChange={(e) =>
                        setParameters({
                          ...parameters,
                          cash: {
                            ...parameters.cash,
                            volatility: parseFloat(e.target.value) / 100,
                          },
                        })
                      }
                      className="w-full p-2 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Autres */}
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h4 className="font-medium text-gray-800 mb-3 text-center">
                  🔧 Autres
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Allocation (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(parameters.other.allocation * 100)}
                      onChange={(e) =>
                        setParameters({
                          ...parameters,
                          other: {
                            ...parameters.other,
                            allocation: parseFloat(e.target.value) / 100,
                          },
                        })
                      }
                      className="w-full p-2 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Rendement (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={parameters.other.return * 100}
                      onChange={(e) =>
                        setParameters({
                          ...parameters,
                          other: {
                            ...parameters.other,
                            return: parseFloat(e.target.value) / 100,
                          },
                        })
                      }
                      className="w-full p-2 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Volatilité (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={parameters.other.volatility * 100}
                      onChange={(e) =>
                        setParameters({
                          ...parameters,
                          other: {
                            ...parameters.other,
                            volatility: parseFloat(e.target.value) / 100,
                          },
                        })
                      }
                      className="w-full p-2 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* Vérification allocation totale */}
            <div className="mt-4 p-3 bg-white rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Allocation totale :
                </span>
                <span
                  className={`font-semibold ${
                    Math.abs(
                      parameters.realEstate.allocation +
                        parameters.stocks.allocation +
                        parameters.crypto.allocation +
                        parameters.cash.allocation +
                        parameters.other.allocation -
                        1
                    ) < 0.01
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {Math.round(
                    (parameters.realEstate.allocation +
                      parameters.stocks.allocation +
                      parameters.crypto.allocation +
                      parameters.cash.allocation +
                      parameters.other.allocation) *
                      100
                  )}
                  %
                </span>
              </div>
              {Math.abs(
                parameters.realEstate.allocation +
                  parameters.stocks.allocation +
                  parameters.crypto.allocation +
                  parameters.cash.allocation +
                  parameters.other.allocation -
                  1
              ) >= 0.01 && (
                <div className="text-xs text-red-600 mt-1">
                  ⚠️ L'allocation totale doit être égale à 100%
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "evolution" && (
          <div>
            {/* Graphique principal */}
            <div className="mb-8" style={{ display: "none" }}>
              <h2 className="text-xl font-semibold mb-4">
                Évolution Probabiliste du Patrimoine
              </h2>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={results}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="year"
                      label={{
                        value: "Années",
                        position: "insideBottom",
                        offset: -5,
                      }}
                    />
                    <YAxis
                      tickFormatter={formatEuro}
                      label={{
                        value: "Patrimoine (€)",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip
                      formatter={(value) => [formatEuro(value), ""]}
                      labelFormatter={(year) => `Année ${year}`}
                    />

                    {/* Zones de confiance */}
                    <Area
                      dataKey="p90"
                      stackId="1"
                      stroke="none"
                      fill="#e3f2fd"
                      fillOpacity={0.6}
                    />
                    <Area
                      dataKey="p75"
                      stackId="2"
                      stroke="none"
                      fill="#bbdefb"
                      fillOpacity={0.6}
                    />
                    <Area
                      dataKey="p50"
                      stackId="3"
                      stroke="none"
                      fill="#2196f3"
                      fillOpacity={0.8}
                    />
                    <Area
                      dataKey="p25"
                      stackId="4"
                      stroke="none"
                      fill="#1976d2"
                      fillOpacity={0.6}
                    />
                    <Area
                      dataKey="p10"
                      stackId="5"
                      stroke="none"
                      fill="#0d47a1"
                      fillOpacity={0.6}
                    />

                    <Line
                      type="monotone"
                      dataKey="mean"
                      stroke="#ff9800"
                      strokeWidth={3}
                      dot={false}
                      name="Moyenne"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-900 rounded"></div>
                  <span>10e percentile</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                  <span>25e percentile</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-400 rounded"></div>
                  <span>Médiane</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-200 rounded"></div>
                  <span>75e percentile</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 rounded"></div>
                  <span>90e percentile</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <span>Moyenne</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "allocation" && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Répartition des Actifs
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-medium mb-4 text-center">
                  Allocation Actuelle
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) =>
                          `${name}: ${value.toFixed(1)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => `${Number(value).toFixed(1)}%`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-medium mb-4 text-center">
                  Répartition Finale
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(finalAllocations).map(
                          ([key, val]) => ({
                            name:
                              key === "realEstate"
                                ? "🏠 Immobilier"
                                : key === "stocks"
                                ? "📈 Actions"
                                : key === "crypto"
                                ? "₿ Crypto"
                                : key === "cash"
                                ? "💰 Liquidités"
                                : "🔧 Autres",
                            value: val * 100,
                            color:
                              key === "realEstate"
                                ? "#8B5CF6"
                                : key === "stocks"
                                ? "#3B82F6"
                                : key === "crypto"
                                ? "#F59E0B"
                                : key === "cash"
                                ? "#10B981"
                                : "#EF4444",
                          })
                        )}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) =>
                          `${name}: ${value.toFixed(1)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(finalAllocations).map(
                          ([key, val], index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                key === "realEstate"
                                  ? "#8B5CF6"
                                  : key === "stocks"
                                  ? "#3B82F6"
                                  : key === "crypto"
                                  ? "#F59E0B"
                                  : key === "cash"
                                  ? "#10B981"
                                  : "#EF4444"
                              }
                            />
                          )
                        )}
                      </Pie>
                      <Tooltip
                        formatter={(value) => `${Number(value).toFixed(1)}%`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-medium mb-4 text-center">
                  Détail des Allocations
                </h3>
                <div className="space-y-4">
                  {pieData.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          {item.value.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatEuro(
                            parameters.initialValue * (item.value / 100)
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  🧁 Répartition Finale (approximation)
                </h3>
                <div className="space-y-4">
                  {Object.entries(finalAllocations).map(([key, val], index) => {
                    const colors = [
                      "#8B5CF6",
                      "#3B82F6",
                      "#F59E0B",
                      "#10B981",
                      "#EF4444",
                    ];
                    const name =
                      key === "realEstate"
                        ? "🏠 Immobilier"
                        : key === "stocks"
                        ? "📈 Actions"
                        : key === "crypto"
                        ? "₿ Crypto"
                        : key === "cash"
                        ? "💰 Liquidités"
                        : "🔧 Autres";

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: colors[index] }}
                          ></div>
                          <span className="font-medium">{name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            {(val * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatEuro(stats.median * val)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "risk" && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Analyse de Risque</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-medium mb-4">
                  Probabilité de Ruine
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ruinProbability}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="year"
                        label={{
                          value: "Années",
                          position: "insideBottom",
                          offset: -5,
                        }}
                      />
                      <YAxis
                        label={{
                          value: "Probabilité (%)",
                          angle: -90,
                          position: "insideLeft",
                        }}
                      />
                      <Tooltip
                        formatter={(value) => [
                          `${Number(value).toFixed(2)}%`,
                          "Probabilité",
                        ]}
                      />

                      <Line
                        type="monotone"
                        dataKey="probability"
                        stroke="#ef4444"
                        strokeWidth={3}
                        dot={{ fill: "#ef4444", strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-700">
                    📊 Cette courbe montre la probabilité cumulative que votre
                    patrimoine tombe à zéro au fil des années.
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-medium mb-4">
                  Métriques de Risque
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-red-800">
                        Probabilité de ruine totale
                      </span>
                      <span className="font-bold text-red-600">
                        {ruinProbability.length > 0
                          ? `${ruinProbability[
                              ruinProbability.length - 1
                            ]?.probability.toFixed(1)}%`
                          : "0%"}
                      </span>
                    </div>
                    <div className="text-sm text-red-600 mt-1">
                      Sur {parameters.timeHorizon} ans
                    </div>
                  </div>

                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-orange-800">
                        Volatilité du portefeuille
                      </span>
                      <span className="font-bold text-orange-600">
                        {(
                          Math.sqrt(
                            Math.pow(
                              parameters.realEstate.allocation *
                                parameters.realEstate.volatility,
                              2
                            ) +
                              Math.pow(
                                parameters.stocks.allocation *
                                  parameters.stocks.volatility,
                                2
                              ) +
                              Math.pow(
                                parameters.crypto.allocation *
                                  parameters.crypto.volatility,
                                2
                              ) +
                              Math.pow(
                                parameters.cash.allocation *
                                  parameters.cash.volatility,
                                2
                              ) +
                              Math.pow(
                                parameters.other.allocation *
                                  parameters.other.volatility,
                                2
                              )
                          ) * 100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <div className="text-sm text-orange-600 mt-1">
                      Estimation simplifiée
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-blue-800">
                        Rendement attendu
                      </span>
                      <span className="font-bold text-blue-600">
                        {(
                          (parameters.realEstate.allocation *
                            parameters.realEstate.return +
                            parameters.stocks.allocation *
                              parameters.stocks.return +
                            parameters.crypto.allocation *
                              parameters.crypto.return +
                            parameters.cash.allocation *
                              parameters.cash.return +
                            parameters.other.allocation *
                              parameters.other.return) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <div className="text-sm text-blue-600 mt-1">
                      Rendement pondéré annuel
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Graphique principal */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Évolution Probabiliste du Patrimoine
          </h2>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={results}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="year"
                  label={{
                    value: "Années",
                    position: "insideBottom",
                    offset: -5,
                  }}
                />
                <YAxis
                  tickFormatter={formatEuro}
                  label={{
                    value: "Patrimoine (€)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip
                  formatter={(value) => [formatEuro(value), ""]}
                  labelFormatter={(year) => `Année ${year}`}
                />

                {/* Zones de confiance */}
                <Area
                  dataKey="p90"
                  stackId="1"
                  stroke="none"
                  fill="#e3f2fd"
                  fillOpacity={0.6}
                />
                <Area
                  dataKey="p75"
                  stackId="2"
                  stroke="none"
                  fill="#bbdefb"
                  fillOpacity={0.6}
                />
                <Area
                  dataKey="p50"
                  stackId="3"
                  stroke="none"
                  fill="#2196f3"
                  fillOpacity={0.8}
                />
                <Area
                  dataKey="p25"
                  stackId="4"
                  stroke="none"
                  fill="#1976d2"
                  fillOpacity={0.6}
                />
                <Area
                  dataKey="p10"
                  stackId="5"
                  stroke="none"
                  fill="#0d47a1"
                  fillOpacity={0.6}
                />

                <Line
                  type="monotone"
                  dataKey="mean"
                  stroke="#ff9800"
                  strokeWidth={3}
                  dot={false}
                  name="Moyenne"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-900 rounded"></div>
              <span>10e percentile</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <span>25e percentile</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-400 rounded"></div>
              <span>Médiane</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-200 rounded"></div>
              <span>75e percentile</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 rounded"></div>
              <span>90e percentile</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span>Moyenne</span>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatEuro(stats.mean)}
            </div>
            <div className="text-sm text-gray-600">Patrimoine moyen</div>
            <div className="text-xs text-green-500 mt-1">
              Réel: {formatEuro(stats.realMean)} (pouvoir d'achat)
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatEuro(stats.median)}
            </div>
            <div className="text-sm text-gray-600">Médiane</div>
            <div className="text-xs text-blue-500 mt-1">
              Réel: {formatEuro(stats.realMedian)}
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">
              {stats.probabilityLoss?.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Probabilité de perte</div>
            <div className="text-xs text-red-500 mt-1">
              Par rapport à l'investissement initial
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">
              {stats.probabilityDoubling?.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Probabilité de doubler</div>
            <div className="text-xs text-purple-500 mt-1">
              En valeur nominale
            </div>
          </div>
        </div>

        {/* Scénarios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="font-semibold text-red-800 mb-2">
              Scénario Pessimiste (10e percentile)
            </h3>
            <div className="text-xl font-bold text-red-600">
              {formatEuro(stats.p10)}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Dans les 10% des cas les plus défavorables
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">
              Scénario Médian
            </h3>
            <div className="text-xl font-bold text-blue-600">
              {formatEuro(stats.median)}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              50% de chance d'être au-dessus de cette valeur
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">
              Scénario Optimiste (90e percentile)
            </h3>
            <div className="text-xl font-bold text-green-600">
              {formatEuro(stats.p90)}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Dans les 10% des cas les plus favorables
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">
            ⚠️ Avertissement
          </h3>
          <p className="text-sm text-yellow-700 mb-2">
            Cette simulation est basée sur des hypothèses statistiques et ne
            constitue pas une garantie de performance future. Les rendements
            passés ne préjugent pas des rendements futurs. Les marchés
            financiers sont imprévisibles.
          </p>
          {parameters.monthlyContribution < 0 && (
            <p className="text-sm text-orange-700 font-medium mb-2">
              📊 <strong>Mode "Vivre de ses rentes"</strong> : Vous retirez{" "}
              {formatEuro(Math.abs(parameters.monthlyContribution * 12))} par an
              de votre patrimoine. Attention au risque d'épuisement si les
              rendements sont insuffisants !
            </p>
          )}
          <div className="mt-3 p-3 bg-white rounded border-l-4 border-blue-500">
            <p className="text-sm text-blue-700">
              📈 <strong>Nouveautés avancées</strong> : Inflation (
              {(parameters.inflation * 100).toFixed(1)}%), fiscalité (
              {(parameters.taxRate * 100).toFixed(0)}%), rebalancement{" "}
              {parameters.rebalancingFrequency === 0
                ? "désactivé"
                : parameters.rebalancingFrequency === 1
                ? "mensuel"
                : parameters.rebalancingFrequency === 3
                ? "trimestriel"
                : parameters.rebalancingFrequency === 6
                ? "semestriel"
                : "annuel"}
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Simulateur;
