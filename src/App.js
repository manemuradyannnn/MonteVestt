import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, Cell } from 'recharts';
import { TrendingUp, AlertCircle, DollarSign, Activity, BarChart3, Shield, Target, Search } from 'lucide-react';

const StockMonteCarloUI = () => {
  const [ticker, setTicker] = useState('ASML');
  const [simulations, setSimulations] = useState(10000);
  const [currentPrice, setCurrentPrice] = useState(850);
  const [investmentAmount, setInvestmentAmount] = useState(10000);
  const [targetAmount, setTargetAmount] = useState(15000);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(0);
  const [stockInfo, setStockInfo] = useState(null);

  // Fetch stock data
  const fetchStockData = async () => {
    try {
      setIsRunning(true);
      setProgress(10);
      
      // Simulated stock data fetch - in production, this would call a real API
      const mockStockData = {
        ASML: { name: 'ASML Holding N.V.', sector: 'Technology', volatility: 0.35, growth: 0.15 },
        AAPL: { name: 'Apple Inc.', sector: 'Technology', volatility: 0.28, growth: 0.12 },
        TSLA: { name: 'Tesla Inc.', sector: 'Automotive', volatility: 0.65, growth: 0.25 },
        MSFT: { name: 'Microsoft Corporation', sector: 'Technology', volatility: 0.25, growth: 0.14 },
        NVDA: { name: 'NVIDIA Corporation', sector: 'Technology', volatility: 0.55, growth: 0.30 },
        GOOGL: { name: 'Alphabet Inc.', sector: 'Technology', volatility: 0.30, growth: 0.13 },
        AMZN: { name: 'Amazon.com Inc.', sector: 'E-commerce', volatility: 0.35, growth: 0.18 },
        META: { name: 'Meta Platforms Inc.', sector: 'Social Media', volatility: 0.45, growth: 0.16 },
        JPM: { name: 'JPMorgan Chase & Co.', sector: 'Banking', volatility: 0.22, growth: 0.08 },
        V: { name: 'Visa Inc.', sector: 'Financial Services', volatility: 0.24, growth: 0.10 }
      };

      const stockData = mockStockData[ticker.toUpperCase()] || {
        name: `${ticker.toUpperCase()} Stock`,
        sector: 'General',
        volatility: 0.30,
        growth: 0.12
      };

      setStockInfo(stockData);
      setProgress(30);
      
      return stockData;
    } catch (error) {
      console.error('Error fetching stock data:', error);
      return null;
    }
  };

  // Monte Carlo simulation engine with geometric Brownian motion
  const runSimulation = async () => {
    const stockData = await fetchStockData();
    if (!stockData) return;

    setProgress(40);

    const dt = 1/252; // Daily time step (252 trading days)
    const timeHorizon = 1; // 1 year projection
    const steps = Math.floor(timeHorizon / dt);
    
    const mu = stockData.growth; // Expected return
    const sigma = stockData.volatility; // Volatility
    
    const allPaths = [];
    const finalPrices = [];
    
    // Run simulations in batches
    const batchSize = 100;
    let completed = 0;

    const runBatch = () => {
      const batchEnd = Math.min(completed + batchSize, simulations);
      
      for (let sim = completed; sim < batchEnd; sim++) {
        const path = [currentPrice];
        let price = currentPrice;
        
        // Generate price path using geometric Brownian motion
        for (let step = 0; step < steps; step++) {
          const randomShock = Math.sqrt(-2 * Math.log(Math.random())) * 
                            Math.cos(2 * Math.PI * Math.random());
          const drift = (mu - 0.5 * sigma * sigma) * dt;
          const diffusion = sigma * Math.sqrt(dt) * randomShock;
          
          price = price * Math.exp(drift + diffusion);
          
          // Store every 10th step to reduce data size
          if (step % 10 === 0) {
            path.push(price);
          }
        }
        
        allPaths.push(path);
        finalPrices.push(price);
      }
      
      completed = batchEnd;
      setProgress(40 + (completed / simulations) * 50);

      if (completed < simulations) {
        setTimeout(runBatch, 0);
      } else {
        processResults(finalPrices, allPaths);
      }
    };

    runBatch();
  };

  const processResults = (prices, allPaths) => {
    setProgress(95);
    
    prices.sort((a, b) => a - b);
    
    const mean = prices.reduce((a, b) => a + b) / prices.length;
    const median = prices[Math.floor(prices.length / 2)];
    const std = Math.sqrt(prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length);
    
    const getPercentile = (p) => prices[Math.floor((p / 100) * prices.length)];
    
    // Calculate investment outcomes
    const shares = investmentAmount / currentPrice;
    const finalValues = prices.map(p => p * shares);
    const targetReached = finalValues.filter(v => v >= targetAmount).length;
    const probTargetReached = (targetReached / simulations) * 100;
    
    const avgFinalValue = mean * shares;
    const expectedReturn = ((avgFinalValue - investmentAmount) / investmentAmount) * 100;
    
    const probProfit = prices.filter(p => p > currentPrice).length / prices.length;
    const var95 = getPercentile(5);
    const var90 = getPercentile(10);
    
    // Potential loss at 95% confidence
    const worstCase5pct = var95 * shares;
    const potentialLoss = investmentAmount - worstCase5pct;
    
    // Create histogram data
    const buckets = 50;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const bucketSize = (max - min) / buckets;
    const histogram = Array(buckets).fill(0).map((_, i) => ({
      range: Math.round(min + i * bucketSize),
      count: 0
    }));
    
    prices.forEach(price => {
      const bucketIndex = Math.min(Math.floor((price - min) / bucketSize), buckets - 1);
      histogram[bucketIndex].count++;
    });
    
    // Create CDF data
    const cdfData = prices.filter((_, i) => i % 100 === 0).map((price, i) => ({
      price: Math.round(price),
      probability: (i * 100) / prices.length
    }));
    
    // Percentile data
    const percentileData = [5, 10, 25, 50, 75, 90, 95].map(p => ({
      percentile: `${p}th`,
      value: Math.round(getPercentile(p))
    }));
    
    // Sample simulation paths (first 100 paths for visualization)
    const pathData = [];
    const pathsToShow = Math.min(100, allPaths.length);
    const pathLength = allPaths[0].length;
    
    for (let i = 0; i < pathLength; i++) {
      const dataPoint = { step: i };
      for (let j = 0; j < pathsToShow; j++) {
        if (allPaths[j][i] !== undefined) {
          dataPoint[`path${j}`] = allPaths[j][i];
        }
      }
      pathData.push(dataPoint);
    }
    
    // Calculate percentile bands for the paths
    const percentileBands = [];
    for (let i = 0; i < pathLength; i++) {
      const stepPrices = allPaths.map(path => path[i]).filter(p => p !== undefined).sort((a, b) => a - b);
      percentileBands.push({
        step: i,
        p5: stepPrices[Math.floor(stepPrices.length * 0.05)],
        p25: stepPrices[Math.floor(stepPrices.length * 0.25)],
        p50: stepPrices[Math.floor(stepPrices.length * 0.50)],
        p75: stepPrices[Math.floor(stepPrices.length * 0.75)],
        p95: stepPrices[Math.floor(stepPrices.length * 0.95)]
      });
    }
    
    // Generate recommendation
    let recommendation = '';
    let rationale = '';
    
    if (expectedReturn > 20 && probProfit > 0.65) {
      recommendation = 'STRONG BUY';
      rationale = 'Significant upside potential with high probability of profit';
    } else if (expectedReturn > 10 && probProfit > 0.55) {
      recommendation = 'BUY';
      rationale = 'Attractive risk-reward profile';
    } else if (expectedReturn > 0 && probProfit > 0.50) {
      recommendation = 'HOLD';
      rationale = 'Fair valuation with moderate upside';
    } else if (expectedReturn > -10) {
      recommendation = 'HOLD/REDUCE';
      rationale = 'Limited upside, consider reducing position';
    } else {
      recommendation = 'SELL';
      rationale = 'Overvalued based on Monte Carlo analysis';
    }
    
    setResults({
      mean: Math.round(mean),
      median: Math.round(median),
      std: Math.round(std),
      min: Math.round(min),
      max: Math.round(max),
      var95: Math.round(var95),
      var90: Math.round(var90),
      probProfit: probProfit * 100,
      expectedReturn,
      histogram,
      cdfData,
      percentileData,
      pathData,
      percentileBands,
      recommendation,
      rationale,
      cv: (std / mean) * 100,
      // Investment specific metrics
      shares: shares.toFixed(2),
      avgFinalValue: Math.round(avgFinalValue),
      probTargetReached,
      worstCase5pct: Math.round(worstCase5pct),
      potentialLoss: Math.round(potentialLoss)
    });
    
    setProgress(100);
    setTimeout(() => setIsRunning(false), 500);
  };

  const getRecommendationColor = (rec) => {
    if (rec === 'STRONG BUY') return 'text-black bg-white border-gray-500';
    if (rec === 'BUY') return 'text-black bg-white border-green-500';
    if (rec === 'HOLD') return 'text-black bg-white border-yellow-500';
    if (rec === 'HOLD/REDUCE') return 'text-black bg-white border-orange-500';
    return 'text-black bg-white border-red-500';
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, trend, highlight }) => (
    <div className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border-2 transition-all duration-200 hover:shadow-xl ${
      highlight ? 'border-blue-300 bg-blue-50/50' : 'border-gray-100'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${highlight ? 'bg-blue-100' : 'bg-gray-100'}`}>
            <Icon className={`w-6 h-6 ${highlight ? 'text-blue-600' : 'text-gray-600'}`} />
          </div>
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        </div>
        {trend !== undefined && trend !== null && (
          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
            trend > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
      </div>
      <div className={`text-3xl font-bold ${highlight ? 'text-blue-700' : 'text-gray-800'}`}>{value}</div>
      {subtitle && <div className="text-sm text-gray-500 mt-2">{subtitle}</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6" style={{ fontFamily: 'Clash Display, sans-serif' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 mt-8">
          <h1 className="text-6xl font-light text-gray-800 mb-6 leading-tight fade-in-blur">
            MonteVest
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed fade-in-blur delay-4">Advanced Risk Analysis & Investment Probability Calculator</p>
          {stockInfo && (
            <div className="mt-6 flex justify-center gap-6">
              <span className="text-sm bg-blue-100 text-blue-900 px-4 py-2 rounded-full font-semibold shadow-sm border border-blue-200">
                {ticker.toUpperCase()}
              </span>
                  <span className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-full shadow-sm border border-gray-200">
                {stockInfo.sector}
              </span>
            </div>
          )}
          <div className="mt-6 text-center">
            <div className="text-sm text-gray-500 mb-2 fade-in-blur delay-4">Geometric Brownian Motion</div>
            <div className="text-lg font-semibold text-blue-600 fade-in-blur delay-4">Monte Carlo Framework</div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-8 border border-white/20 slide-up">
          <h2 className="text-2xl font-light text-gray-800 mb-6">Simulation Parameters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Stock Ticker Symbol
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase transition-all duration-200 shadow-sm"
                  placeholder="e.g., AAPL"
                  disabled={isRunning}
                />
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Current Stock Price ($)
              </label>
              <input
                type="number"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(parseFloat(e.target.value))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
                min="0"
                step="0.01"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Number of Simulations
              </label>
              <input
                type="number"
                value={simulations}
                onChange={(e) => setSimulations(parseInt(e.target.value))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
                min="1000"
                max="50000"
                step="1000"
                disabled={isRunning}
              />
            </div>
          </div>

          <div className="mt-8 pt-8 border-t-2 border-gray-100">
            <h3 className="text-xl font-light text-gray-800 mb-6">Investment Goals</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Investment Amount ($)
                </label>
                <input
                  type="number"
                  value={investmentAmount}
                  onChange={(e) => setInvestmentAmount(parseFloat(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
                  min="0"
                  step="100"
                  disabled={isRunning}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Target Amount ($)
                </label>
                <input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(parseFloat(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
                  min="0"
                  step="100"
                  disabled={isRunning}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={runSimulation}
                  disabled={isRunning}
                  className={`w-full py-4 rounded-xl font-semibold text-white transition-all duration-200 shadow-lg hover:shadow-xl ${
                    isRunning
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                  }`}
                >
                  {isRunning ? `Analyzing... ${progress.toFixed(0)}%` : 'Run Monte Carlo Simulation'}
                </button>
              </div>
            </div>
          </div>

          {isRunning && (
            <div className="mt-6 p-6 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex justify-between text-sm text-gray-700 mb-3">
                <span className="font-medium">Analysis Progress</span>
                <span className="font-semibold">{progress.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2 shadow-sm"
                  style={{ width: `${progress}%` }}
                >
                  {progress > 10 && <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-sm" />}
                </div>
              </div>
            </div>
          )}
        </div>

        {results && (
          <>
            {/* Recommendation Banner */}
            <div className={`rounded-2xl shadow-xl p-10 mb-8 border-2 ${getRecommendationColor(results.recommendation)} backdrop-blur-sm`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold mb-3 opacity-80 tracking-wide">INVESTMENT RECOMMENDATION</div>
                  <div className="text-5xl font-bold mb-4">{results.recommendation}</div>
                  <div className="text-lg opacity-90 leading-relaxed max-w-lg">{results.rationale}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold mb-3 opacity-80 tracking-wide">Expected Return</div>
                  <div className={`text-6xl font-bold ${results.expectedReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {results.expectedReturn >= 0 ? '+' : ''}{results.expectedReturn.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Investment Goal Analysis */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-10 mb-8 text-black slide-up-delay border border-white/20">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Target className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-3xl font-light text-gray-800">Investment Goal Analysis</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 backdrop-blur-sm border border-blue-200/50 hover:shadow-lg transition-all duration-200">
                  <div className="text-sm font-semibold mb-2 opacity-80 text-blue-700">Shares Purchased</div>
                  <div className="text-4xl font-bold text-blue-900">{results.shares}</div>
                  <div className="text-sm mt-2 opacity-70 text-blue-600">@ ${currentPrice.toFixed(2)}/share</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 backdrop-blur-sm border border-green-200/50 hover:shadow-lg transition-all duration-200">
                  <div className="text-sm font-semibold mb-2 opacity-80 text-green-700">Expected Value (1 Year)</div>
                  <div className="text-4xl font-bold text-green-900">${results.avgFinalValue.toFixed(2)}</div>
                  <div className="text-sm mt-2 opacity-70 text-green-600">Mean outcome</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 backdrop-blur-sm border border-purple-200/50 hover:shadow-lg transition-all duration-200">
                  <div className="text-sm font-semibold mb-2 opacity-80 text-purple-700">Target Probability</div>
                  <div className="text-4xl font-bold text-purple-900">{results.probTargetReached.toFixed(1)}%</div>
                  <div className="text-sm mt-2 opacity-70 text-purple-600">Reaching ${targetAmount.toFixed(2)}</div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 backdrop-blur-sm border border-red-200/50 hover:shadow-lg transition-all duration-200">
                  <div className="text-sm font-semibold mb-2 opacity-80 text-red-700">Worst Case (95%)</div>
                  <div className="text-4xl font-bold text-red-900">${results.worstCase5pct.toFixed(2)}</div>
                  <div className="text-sm mt-2 opacity-70 text-red-600">Potential loss: ${results.potentialLoss.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 slide-up-delay-2">
              <StatCard
                icon={DollarSign}
                title="Mean Stock Price"
                value={`$${results.mean.toFixed(2)}`}
                subtitle={`vs Current: $${currentPrice.toFixed(2)}`}
                trend={results.expectedReturn}
              />
              <StatCard
                icon={Activity}
                title="Median Price"
                value={`$${results.median.toFixed(2)}`}
                subtitle={`50th Percentile`}
              />
              <StatCard
                icon={TrendingUp}
                title="Probability of Profit"
                value={`${results.probProfit.toFixed(1)}%`}
                subtitle={`Stock price > $${currentPrice.toFixed(2)}`}
                highlight={true}
              />
              <StatCard
                icon={Shield}
                title="Value at Risk (95%)"
                value={`$${results.var95.toFixed(2)}`}
                subtitle={`5th Percentile`}
              />
            </div>

            {/* Monte Carlo Simulation Paths */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-8 border border-white/20 slide-up-delay">
              <h3 className="text-2xl font-light text-gray-800 mb-6">Monte Carlo Simulation Paths (100 samples)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={results.pathData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#000000" />
                  <XAxis 
                    dataKey="step" 
                    label={{ value: 'Trading Days', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#000000' } }} 
                    stroke="#4C5B61"
                  />
                  <YAxis 
                    label={{ value: 'Stock Price ($)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#000000' } }}
                    domain={['auto', 'auto']}
                    stroke="#4C5B61"
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length > 0) {
                        const values = payload.map(p => p.value).filter(v => v !== undefined);
                        const min = Math.min(...values);
                        const max = Math.max(...values);
                        const median = values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
                        
                        return (
                          <div className="bg-white border border-gray-300 rounded-lg shadow-2xl p-4 max-w-xs z-50 relative">
                            <p className="font-semibold text-gray-800 mb-2">Trading Day {label}</p>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Paths shown:</span>
                                <span className="font-medium">{values.length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-600">Median:</span>
                                <span className="font-medium">${median.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-green-600">Min:</span>
                                <span className="font-medium">${min.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-red-600">Max:</span>
                                <span className="font-medium">${max.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                    cursor={{ strokeDasharray: '3 3', stroke: '#666', strokeWidth: 1 }}
                  />
                  {Object.keys(results.pathData[0])
                    .filter(key => key.startsWith('path'))
                    .map((key, idx) => (
                      <Line 
                        key={key}
                        type="monotone" 
                        dataKey={key} 
                        stroke={`rgba(0, 0, 128, ${0.5})`}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Percentile Confidence Bands */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-8 border border-white/20 slide-up-delay-2">
              <h3 className="text-xl font-light text-gray-800 mb-6">Price Evolution with Confidence Bands</h3>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={results.percentileBands}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#000000" />
                  <XAxis 
                    dataKey="step" 
                    label={{ value: 'Trading Days', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#000000' } }} 
                    stroke="#4C5B61"
                  />
                  <YAxis label={{ value: 'Stock Price ($)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#000000' } }} stroke="#4C5B61" />
                  <Tooltip />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    wrapperStyle={{ paddingTop: '20px' }}
                  />
                  <Area type="monotone" dataKey="p95" stackId="1" stroke="#1F2937" fill="#1F2937" fillOpacity={0.08} name="95th Percentile" />
                  <Area type="monotone" dataKey="p75" stackId="2" stroke="#374151" fill="#374151" fillOpacity={0.12} name="75th Percentile" />
                  <Area type="monotone" dataKey="p50" stackId="3" stroke="#4B5563" fill="#4B5563" fillOpacity={0.16} name="Median" strokeWidth={3} />
                  <Area type="monotone" dataKey="p25" stackId="4" stroke="#6B7280" fill="#6B7280" fillOpacity={0.12} name="25th Percentile" />
                  <Area type="monotone" dataKey="p5" stackId="5" stroke="#9CA3AF" fill="#9CA3AF" fillOpacity={0.08} name="5th Percentile" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 slide-up-delay">
              {/* Distribution Chart */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
                <h3 className="text-xl font-light text-gray-800 mb-6">Final Price Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={results.histogram}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#949B96" />
                    <XAxis dataKey="range" label={{ value: 'Stock Price ($)', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#000000' } }} stroke="#4C5B61" />
                    <YAxis label={{ value: 'Frequency', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#000000' } }} stroke="#4C5B61" />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#333333" fill="#CCCCCC" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Cumulative Distribution */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
                <h3 className="text-xl font-light text-gray-800 mb-6">Cumulative Probability</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={results.cdfData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#949B96" />
                    <XAxis dataKey="price" label={{ value: 'Stock Price ($)', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#000000' } }} stroke="#000000" />
                    <YAxis label={{ value: 'Cumulative %', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#000000' } }} stroke="#000000" />
                    <Tooltip />
                    <Line type="monotone" dataKey="probability" stroke="#333333" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Percentile Analysis */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
                <h3 className="text-xl font-light text-gray-800 mb-6">Percentile Analysis</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={results.percentileData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#949B96" />
                    <XAxis dataKey="percentile" stroke="#4C5B61" />
                    <YAxis label={{ value: 'Price ($)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#000000' } }} stroke="#4C5B61" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#000080">
                      {results.percentileData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 3 ? '#000060' : '#0000A0'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Risk Metrics Summary */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
                <h3 className="text-xl font-light text-gray-800 mb-6">Risk Metrics Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="font-semibold text-black">Standard Deviation</span>
                    <span className="text-lg font-normal text-black">${results.std.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="font-semibold text-black">Coefficient of Variation</span>
                    <span className="text-lg font-normal text-black">{results.cv.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                    <span className="font-semibold text-black">Downside Risk (5th %ile)</span>
                    <span className="text-lg font-normal text-black">${results.var95.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="font-semibold text-black">Upside Potential (95th %ile)</span>
                    <span className="text-lg font-normal text-black">${results.percentileData[6].value.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Statistics Table */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20 slide-up-delay-2">
              <h3 className="text-2xl font-light text-gray-800 mb-6">Complete Statistical Summary</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="px-4 py-3 font-semibold text-black">Metric</th>
                      <th className="px-4 py-3 font-semibold text-black">Value</th>
                      <th className="px-4 py-3 font-semibold text-black">Interpretation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td className="px-4 py-3 font-medium">Investment Amount</td>
                      <td className="px-4 py-3 font-normal">${investmentAmount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-black">Initial capital invested</td>
                    </tr>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td className="px-4 py-3 font-medium">Target Amount</td>
                      <td className="px-4 py-3 font-normal">${targetAmount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-black">Your investment goal</td>
                    </tr>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td className="px-4 py-3 font-medium">Probability of Reaching Target</td>
                      <td className="px-4 py-3 font-normal text-black">{results.probTargetReached.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-sm text-black">Likelihood of achieving your goal</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 font-medium">Expected Final Value</td>
                      <td className="px-4 py-3">${results.avgFinalValue.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-black">Mean portfolio value after 1 year</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 font-medium">Mean Stock Price</td>
                      <td className="px-4 py-3">${results.mean.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-black">Average price across simulations</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 font-medium">Median Stock Price</td>
                      <td className="px-4 py-3">${results.median.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-black">50% of outcomes above/below</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 font-medium">Standard Deviation</td>
                      <td className="px-4 py-3">${results.std.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-black">Measure of price volatility</td>
                    </tr>
                    <tr className="border-b border-gray-200 bg-red-50">
                      <td className="px-4 py-3 font-medium">Worst Case Portfolio Value (95%)</td>
                      <td className="px-4 py-3 font-bold text-red-700">${results.worstCase5pct.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-black">95% confidence minimum value</td>
                    </tr>
                    <tr className="border-b border-gray-200 bg-red-50">
                      <td className="px-4 py-3 font-medium">Maximum Potential Loss</td>
                      <td className="px-4 py-3 font-bold text-red-700">${results.potentialLoss.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-black">At 95% confidence level</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 font-medium">Probability of Profit</td>
                      <td className="px-4 py-3">{results.probProfit.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-sm text-black">Stock price above current</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium">Expected Return</td>
                      <td className="px-4 py-3 font-normal">{results.expectedReturn >= 0 ? '+' : ''}{results.expectedReturn.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-sm text-black">Mean return vs current price</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-gray-600 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 slide-up-delay">
              <p className="font-normal text-gray-700 mb-2">
                Analysis based on {simulations.toLocaleString()} Monte Carlo simulations using Geometric Brownian Motion
              </p>
              <p className="mb-3">
                Stock: <span className="font-semibold text-blue-600">{ticker.toUpperCase()}</span> • Projection: 1 Year ({252} trading days) • Model: GBM with drift and volatility
              </p>
              <p className="text-xs text-gray-500">
                For informational purposes only • Not financial advice • Past performance does not guarantee future results
              </p>
            </div>
          </>
        )}

        {!results && !isRunning && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200 slide-up">
            <BarChart3 className="w-16 h-16 text-black mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-black mb-2">Ready to Analyze</h3>
            <p className="text-black mb-4">
              Enter a stock ticker, current price, your investment amount, and target goal above
            </p>
            <div className="text-sm text-black max-w-2xl mx-auto">
              <p className="mb-2 font-semibold text-black">This Monte Carlo simulator will:</p>
              <ul className="text-left space-y-1 inline-block">
                <li>• Run {simulations.toLocaleString()} price simulations using Geometric Brownian Motion</li>
                <li>• Calculate probability of reaching your investment target</li>
                <li>• Show expected returns and worst-case scenarios</li>
                <li>• Visualize all possible price paths over 1 year</li>
                <li>• Provide a BUY/SELL/HOLD recommendation</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockMonteCarloUI;