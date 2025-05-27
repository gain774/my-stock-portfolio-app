'use client';

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Tooltip, Legend } from 'recharts';
import { Menu, Search, X, Settings, User, BarChart as BarChartIcon, PlusCircle, Grid3x3, Grid2x2, Square, LayoutGrid, Plus, Minus, RefreshCw, Download, TrendingUp } from 'lucide-react';

// Alpha Vantage API設定 - 外部データサービスとの通信設定
const ALPHA_VANTAGE_API_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY;
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

// Alpha Vantage APIクライアント - データ取得の専門クラス
class AlphaVantageAPI {
  // 日次株価データを取得するメソッド
  static async getDailyData(symbol: string) {
    try {
      const response = await fetch(
        `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      const data = await response.json();
      
      if (data['Error Message']) {
        throw new Error('銘柄が見つかりません');
      }
      
      if (data['Note']) {
        throw new Error('API制限に達しました。しばらく待ってから再試行してください。');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
  
  // APIから取得したデータを使いやすい形式に変換するメソッド
  static parseStockData(apiData: any) {
    const timeSeries = apiData['Time Series (Daily)'];
    if (!timeSeries) return null;
    
    const dates = Object.keys(timeSeries).sort().reverse();
    const latestDate = dates[0];
    const latestData = timeSeries[latestDate];
    
    return {
      date: latestDate,
      open: parseFloat(latestData['1. open']),
      high: parseFloat(latestData['2. high']),
      low: parseFloat(latestData['3. low']),
      close: parseFloat(latestData['4. close']),
      volume: parseInt(latestData['5. volume'])
    };
  }
}

// メインアプリケーションコンポーネント - 全体の統括管理
export default function StockPortfolioApp() {
  // アプリケーションの状態管理 - ユーザーの操作に応じて変化するデータ
  const [activeTab, setActiveTab] = useState('楽観シナリオ');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [portfolioDisplay, setPortfolioDisplay] = useState(4);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [investmentViewMode, setInvestmentViewMode] = useState('numbers');
  const [expandedSections, setExpandedSections] = useState({
    domestic: false,
    us: false,
    fund: false
  });
  const [stockPrices, setStockPrices] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState('');

  // 株価データを取得する関数 - 外部APIとの通信を管理
  const fetchStockPrice = async (symbol: string) => {
    setIsLoading(true);
    setApiStatus(`${symbol} のデータを取得中...`);
    
    try {
      const data = await AlphaVantageAPI.getDailyData(symbol);
      const parsedData = AlphaVantageAPI.parseStockData(data);
      
      if (parsedData) {
        setStockPrices(prev => ({
          ...prev,
          [symbol]: parsedData
        }));
        setApiStatus(`${symbol} のデータを取得しました`);
      }
    } catch (error: any) {
      setApiStatus(`エラー: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 複数の株価データを一括更新する関数
  const updateAllPrices = async () => {
    const symbols = ['AAPL', 'MSFT', '7203.T', '9432.T'];
    
    for (const symbol of symbols) {
      await fetchStockPrice(symbol);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  // セクション展開状態を切り替える関数
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        isMenuOpen={isMenuOpen} 
        setIsMenuOpen={setIsMenuOpen}
        onStockSearch={fetchStockPrice}
        isLoading={isLoading}
      />
      <SideMenu isOpen={isMenuOpen} setIsOpen={setIsMenuOpen} />
      
      {/* API状態表示 - ユーザーに現在の処理状況を知らせる */}
      {apiStatus && (
        <div className="max-w-6xl mx-auto p-4">
          <div className={`p-3 rounded-lg text-sm ${
            apiStatus.includes('エラー') 
              ? 'bg-red-100 text-red-700' 
              : 'bg-blue-100 text-blue-700'
          }`}>
            {apiStatus}
          </div>
        </div>
      )}
      
      {/* データ管理パネル - 取得した株価データの管理インターフェース */}
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">株価データ管理</h3>
              <p className="text-sm text-gray-600">Alpha Vantage APIからリアルタイム株価を取得</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={updateAllPrices}
                disabled={isLoading}
                className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                全て更新
              </button>
              <button
                onClick={() => console.log('現在の株価データ:', stockPrices)}
                className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
              >
                <Download className="w-4 h-4" />
                データ出力
              </button>
            </div>
          </div>
          
          {/* 取得済みデータ表示 */}
          {Object.keys(stockPrices).length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-medium mb-2">取得済みデータ</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(stockPrices).map(([symbol, data]) => (
                  <div key={symbol} className="bg-gray-50 rounded p-3">
                    <div className="font-medium">{symbol}</div>
                    <div className="text-sm text-gray-600">
                      <div>始値: ${data.open.toFixed(2)}</div>
                      <div>終値: ${data.close.toFixed(2)}</div>
                      <div>日付: {data.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <TotalInvestmentSection 
        viewMode={investmentViewMode}
        setViewMode={setInvestmentViewMode}
        expandedSections={expandedSections}
        toggleSection={toggleSection}
        stockPrices={stockPrices}
      />
      <PortfolioSection 
        portfolioDisplay={portfolioDisplay} 
        setPortfolioDisplay={setPortfolioDisplay}
        showCreateForm={showCreateForm}
        setShowCreateForm={setShowCreateForm}
        stockPrices={stockPrices}
        onFetchPrice={fetchStockPrice}
      />
      <SimulationSection activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

// ヘッダーコンポーネント - アプリケーションの上部ナビゲーション
function Header({ isMenuOpen, setIsMenuOpen, onStockSearch, isLoading }: any) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() && onStockSearch) {
      onStockSearch(searchTerm.trim().toUpperCase());
      setSearchTerm('');
    }
  };

  return (
    <div className="bg-white shadow-sm p-4 relative">
      <div className="max-w-6xl mx-auto flex items-center gap-4">
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6 text-gray-600" />
        </button>
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="銘柄コードを入力 (例: AAPL, 7203.T)"
            disabled={isLoading}
          />
        </form>
        <button 
          type="submit"
          onClick={handleSearch}
          disabled={isLoading || !searchTerm.trim()}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? '取得中...' : '検索'}
        </button>
      </div>
    </div>
  );
}

// サイドメニューコンポーネント - ナビゲーションメニュー
function SideMenu({ isOpen, setIsOpen }: any) {
  const menuItems = [
    { icon: BarChartIcon, label: 'ダッシュボード', active: true },
    { icon: BarChartIcon, label: 'ポートフォリオ管理' },
    { icon: Search, label: '銘柄検索' },
    { icon: BarChartIcon, label: 'パフォーマンス分析' },
    { icon: Settings, label: '設定' },
    { icon: User, label: 'プロフィール' }
  ];

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={() => setIsOpen(false)}
      />
      <div className="fixed left-0 top-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">株式ポートフォリオ</h2>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems.map((item, idx) => (
              <li key={idx}>
                <button className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                  item.active ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}>
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            <p>合計資産: ¥1,234,567</p>
            <p className="text-green-600">今日の損益: +¥12,345</p>
          </div>
        </div>
      </div>
    </>
  );
}

// 合計投資額セクション - 投資サマリーの表示と管理
function TotalInvestmentSection({ viewMode, setViewMode, expandedSections, toggleSection, stockPrices }: any) {
  // APIから取得した価格で更新する関数
  const updatePriceFromAPI = (basePrice: number, symbol: string) => {
    if (stockPrices[symbol]) {
      return stockPrices[symbol].close;
    }
    return basePrice;
  };

  // 投資データの定義 - サンプルデータとAPI連携
  const investmentData = {
    domestic: {
      total: 523456,
      change: -2.2,
      stocks: [
        { 
          name: 'トヨタ自動車', 
          symbol: '7203.T',
          amount: 150000, 
          change: 2.1,
          currentPrice: updatePriceFromAPI(2567, '7203.T')
        },
        { 
          name: 'ソフトバンクグループ', 
          symbol: '9984.T',
          amount: 120000, 
          change: -1.5,
          currentPrice: updatePriceFromAPI(3890, '9984.T')
        },
        { 
          name: '三菱UFJフィナンシャル・グループ', 
          symbol: '8306.T',
          amount: 100000, 
          change: 0.8,
          currentPrice: updatePriceFromAPI(987, '8306.T')
        }
      ]
    },
    us: {
      total: 456789,
      change: 5.2,
      stocks: [
        { 
          name: 'Apple Inc.', 
          symbol: 'AAPL',
          amount: 180000, 
          change: 3.4,
          currentPrice: updatePriceFromAPI(180, 'AAPL')
        },
        { 
          name: 'Microsoft Corporation', 
          symbol: 'MSFT',
          amount: 150000, 
          change: 2.8,
          currentPrice: updatePriceFromAPI(350, 'MSFT')
        }
      ]
    },
    fund: {
      total: 254322,
      change: 1.1,
      funds: [
        { name: 'eMAXIS Slim 全世界株式', amount: 120000, change: 1.5 },
        { name: 'iFree S&P500インデックス', amount: 89322, change: 2.1 }
      ]
    }
  };

  const chartData = [
    { name: '国内株式', value: investmentData.domestic.total },
    { name: '米国株式', value: investmentData.us.total },
    { name: '投資信託', value: investmentData.fund.total }
  ];

  const totalAmount = investmentData.domestic.total + investmentData.us.total + investmentData.fund.total;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">投資額サマリー</h2>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('numbers')}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === 'numbers' ? 'bg-white shadow-sm' : 'text-gray-600'
              }`}
            >
              数字
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === 'chart' ? 'bg-white shadow-sm' : 'text-gray-600'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        {viewMode === 'numbers' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center sm:text-left">
              <h3 className="text-sm text-gray-600 mb-2">合計投資額</h3>
              <div className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">¥{totalAmount.toLocaleString()}</div>
              <div className="text-green-600 text-sm font-medium">+¥45,678 (+3.8%)</div>
            </div>
            
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-between">
                <h3 className="text-sm text-gray-600 mb-2">国内株式</h3>
                <button
                  onClick={() => toggleSection('domestic')}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  {expandedSections.domestic ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-xl lg:text-2xl font-semibold text-gray-900 mb-1">¥{investmentData.domestic.total.toLocaleString()}</div>
              <div className="text-red-600 text-sm font-medium">{investmentData.domestic.change}%</div>
            </div>
            
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-between">
                <h3 className="text-sm text-gray-600 mb-2">米国株式</h3>
                <button
                  onClick={() => toggleSection('us')}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  {expandedSections.us ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-xl lg:text-2xl font-semibold text-gray-900 mb-1">¥{investmentData.us.total.toLocaleString()}</div>
              <div className="text-green-600 text-sm font-medium">+{investmentData.us.change}%</div>
            </div>
            
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-between">
                <h3 className="text-sm text-gray-600 mb-2">投資信託</h3>
                <button
                  onClick={() => toggleSection('fund')}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  {expandedSections.fund ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-xl lg:text-2xl font-semibold text-gray-900 mb-1">¥{investmentData.fund.total.toLocaleString()}</div>
              <div className="text-green-600 text-sm font-medium">+{investmentData.fund.change}%</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#3B82F6" />
                    <Cell fill="#EF4444" />
                    <Cell fill="#10B981" />
                  </Pie>
                  <Tooltip formatter={(value: any) => `¥${value.toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value: any) => `¥${value.toLocaleString()}`} />
                  <Bar dataKey="value" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {(expandedSections.domestic || expandedSections.us || expandedSections.fund) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {expandedSections.domestic && (
                <InvestmentBreakdown
                  title="国内株式内訳"
                  data={investmentData.domestic.stocks}
                  color="blue"
                />
              )}
              
              {expandedSections.us && (
                <InvestmentBreakdown
                  title="米国株式内訳"
                  data={investmentData.us.stocks}
                  color="red"
                />
              )}
              
              {expandedSections.fund && (
                <InvestmentBreakdown
                  title="投資信託内訳"
                  data={investmentData.fund.funds}
                  color="green"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 投資内訳コンポーネント - 詳細な投資項目の表示
function InvestmentBreakdown({ title, data, color }: any) {
  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50',
    red: 'border-red-200 bg-red-50',
    green: 'border-green-200 bg-green-50'
  };

  return (
    <div className={`border rounded-lg p-4 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <h4 className="font-semibold mb-3">{title}</h4>
      <div className="space-y-2">
        {data.map((item: any, idx: number) => (
          <div key={idx} className="flex justify-between items-center text-sm">
            <div className="flex-1 min-w-0">
              <span className="text-gray-700 truncate block">{item.name}</span>
              {item.symbol && (
                <span className="text-xs text-gray-500">{item.symbol}</span>
              )}
              {item.currentPrice > 0 && (
                <span className="text-xs text-blue-600 block">
                  現在価格: ${item.currentPrice.toFixed(2)}
                </span>
              )}
            </div>
            <div className="text-right ml-2 flex-shrink-0">
              <div className="font-medium">¥{item.amount.toLocaleString()}</div>
              <div className={`text-xs ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {item.change >= 0 ? '+' : ''}{item.change}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ポートフォリオセクション - ポートフォリオ管理インターフェース
function PortfolioSection({ portfolioDisplay, setPortfolioDisplay, showCreateForm, setShowCreateForm }: any) {
  const portfolioData = {
    growth: [
      { name: 'トヨタ', code: '7203', price: '¥2,567', yield: '4.2%', per: 10.5, pbr: 1.2, change: '+1.8%', positive: true },
      { name: 'NTT', code: '9432', price: '¥3,890', yield: '4.5%', per: 13.2, pbr: 1.5, change: '0.6%', positive: true },
    ],
    income: [
      { name: 'ソニー', code: '6758', price: '¥13,245', yield: '1.8%', per: 22.3, pbr: 3.5, change: '+2.3%', positive: true },
    ],
    reit: [
      { name: 'KDDI', code: '9433', price: '¥4,205', yield: '3.9%', per: 14.2, pbr: 1.8, change: '+0.8%', positive: true },
    ],
    dividend: [
      { name: '三菱UFJ', code: '8306', price: '¥987', yield: '4.8%', per: 8.9, pbr: 0.9, change: '+1.2%', positive: true },
    ]
  };

  const displayButtons = [
    { count: 1, icon: Square, label: '1列表示' },
    { count: 2, icon: Grid2x2, label: '2列表示' },
    { count: 3, icon: Grid3x3, label: '3列表示' },
    { count: 4, icon: LayoutGrid, label: '4列表示' }
  ];

  const getGridClass = () => {
    switch(portfolioDisplay) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-3';
      case 4: return 'grid-cols-2 xl:grid-cols-4';
      default: return 'grid-cols-2';
    }
  };

  const portfolioList = [
    { key: 'growth', title: '高配当株', total: '¥542,300', gain: '+¥3,150', color: 'blue' },
    { key: 'income', title: '成長株', total: '¥389,200', gain: '+¥7,890', color: 'red' },
    { key: 'reit', title: '金・商品', total: '¥228,100', gain: '+¥2,150', color: 'yellow' },
    { key: 'dividend', title: '債券株', total: '¥456,700', gain: '+¥8,240', color: 'green' }
  ].slice(0, portfolioDisplay);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">ポートフォリオ</h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-white rounded-lg shadow p-1">
            {displayButtons.map((button) => (
              <button
                key={button.count}
                onClick={() => setPortfolioDisplay(button.count)}
                className={`p-2 rounded transition-colors ${
                  portfolioDisplay === button.count
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title={button.label}
              >
                <button.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            ポートフォリオ作成
          </button>
        </div>
      </div>
      
      {showCreateForm && (
        <CreatePortfolioForm onClose={() => setShowCreateForm(false)} />
      )}
      
      <div className={`grid gap-6 ${getGridClass()}`}>
        {portfolioList.map((portfolio) => (
          <StockCard 
            key={portfolio.key}
            title={portfolio.title} 
            total={portfolio.total} 
            gain={portfolio.gain} 
            stocks={portfolioData[portfolio.key as keyof typeof portfolioData]} 
            color={portfolio.color} 
          />
        ))}
      </div>
    </div>
  );
}

// ポートフォリオ作成フォーム - 新しいポートフォリオの作成インターフェース
function CreatePortfolioForm({ onClose }: any) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'growth'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('新しいポートフォリオ:', formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">新しいポートフォリオを作成</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">ポートフォリオ名</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: 日本高配当株"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">説明</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ポートフォリオの説明を入力"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">カテゴリー</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="growth">成長株</option>
              <option value="dividend">高配当株</option>
              <option value="reit">REIT・不動産</option>
              <option value="commodity">金・商品</option>
              <option value="bond">債券</option>
            </select>
          </div>
          
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              作成
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 株式カードコンポーネント - 個別ポートフォリオの表示
function StockCard({ title, total, gain, stocks, color }: any) {
  const colorClasses = {
    blue: 'border-l-blue-500 bg-blue-50',
    red: 'border-l-red-500 bg-red-50',
    yellow: 'border-l-yellow-500 bg-yellow-50',
    green: 'border-l-green-500 bg-green-50'
  };

  return (
    <div className={`bg-white rounded-lg shadow border-l-4 ${colorClasses[color as keyof typeof colorClasses]} p-4 min-h-[200px]`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-lg">{title}</h3>
        <div className="text-right flex-shrink-0 ml-4">
          <div className="font-bold text-lg whitespace-nowrap">{total}</div>
          <div className="text-green-600 text-sm whitespace-nowrap">{gain}</div>
        </div>
      </div>
      <div className="space-y-3">
        {stocks.map((stock: any, idx: number) => (
          <div key={idx} className="border-b border-gray-100 pb-2 last:border-b-0">
            <div className="flex justify-between items-center mb-1">
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-900 block truncate">{stock.name}</span>
                <span className="text-gray-500 text-xs">{stock.code}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="font-medium text-sm whitespace-nowrap">{stock.price}</span>
                <span className={`text-xs font-medium whitespace-nowrap ${stock.positive ? 'text-green-600' : 'text-red-600'}`}>
                  {stock.change}
                </span>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>利回り: {stock.yield}</span>
              <span>PER: {stock.per} | PBR: {stock.pbr}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// シミュレーションセクション - 投資シミュレーション機能
function SimulationSection({ activeTab, setActiveTab }: any) {
  const [screeningFilters, setScreeningFilters] = useState({
    sector: '',
    minPrice: '',
    maxPrice: '',
    minYield: '',
    maxYield: '',
    minPer: '',
    maxPer: '',
    minPbr: '',
    maxPbr: '',
    minMarketCap: '',
    maxMarketCap: ''
  });

  const tabs = ['楽観シナリオ', '現実的シナリオ', '悲観シナリオ'];
  
  const simulationData = [
    { year: '現在', value: 1000000 },
    { year: '1年後', value: 1089000 },
    { year: '2年後', value: 1185000 },
    { year: '3年後', value: 1289000 },
    { year: '4年後', value: 1402000 },
    { year: '5年後', value: 1526000 },
    { year: '6年後', value: 1662000 },
    { year: '7年後', value: 1810000 },
    { year: '8年後', value: 1971000 },
    { year: '9年後', value: 2147000 },
    { year: '10年後', value: 2338000 }
  ];

  const handleFilterChange = (key: string, value: string) => {
    setScreeningFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setScreeningFilters({
      sector: '',
      minPrice: '',
      maxPrice: '',
      minYield: '',
      maxYield: '',
      minPer: '',
      maxPer: '',
      minPbr: '',
      maxPbr: '',
      minMarketCap: '',
      maxMarketCap: ''
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">スクリーニング＆シミュレーション</h2>
      
      {/* スクリーニング条件 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">銘柄スクリーニング</h3>
          <button
            onClick={resetFilters}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            条件をリセット
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* 業種 */}
          <div>
            <label className="block text-sm font-medium mb-1">業種</label>
            <select
              value={screeningFilters.sector}
              onChange={(e) => handleFilterChange('sector', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全業種</option>
              <option value="technology">テクノロジー</option>
              <option value="finance">金融</option>
              <option value="healthcare">ヘルスケア</option>
              <option value="consumer">消費者向け</option>
              <option value="materials">素材</option>
              <option value="energy">エネルギー</option>
            </select>
          </div>
          
          {/* 株価範囲 */}
          <div>
            <label className="block text-sm font-medium mb-1">株価範囲 (¥)</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="最小"
                value={screeningFilters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                className="flex-1 border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="self-center">〜</span>
              <input
                type="number"
                placeholder="最大"
                value={screeningFilters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                className="flex-1 border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* 配当利回り */}
          <div>
            <label className="block text-sm font-medium mb-1">配当利回り (%)</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="最小"
                step="0.1"
                value={screeningFilters.minYield}
                onChange={(e) => handleFilterChange('minYield', e.target.value)}
                className="flex-1 border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="self-center">〜</span>
              <input
                type="number"
                placeholder="最大"
                step="0.1"
                value={screeningFilters.maxYield}
                onChange={(e) => handleFilterChange('maxYield', e.target.value)}
                className="flex-1 border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 font-medium">
            スクリーニング実行
          </button>
          <button className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 font-medium">
            選択銘柄でシミュレーション
          </button>
        </div>
      </div>

      {/* シミュレーション結果 */}
      <div className="bg-white rounded-lg shadow p-6">
        {/* タブ */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded text-sm font-medium whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {/* グラフ表示 */}
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={simulationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="year" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `¥${(value / 1000000).toFixed(1)}M`}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
              <Tooltip formatter={(value: any) => [`¥${value.toLocaleString()}`, '投資額']} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* 予測結果 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold mb-3 text-lg">10年後の予測</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded p-3">
              <div className="text-xs text-gray-600 mb-1">投資元本</div>
              <div className="font-bold text-lg">¥1,000,000</div>
            </div>
            <div className="bg-white rounded p-3">
              <div className="text-xs text-gray-600 mb-1">予測時価</div>
              <div className="font-bold text-lg text-green-600">¥2,345,678</div>
              <div className="text-xs text-green-600 font-medium">(+134.5%)</div>
            </div>
            <div className="bg-white rounded p-3">
              <div className="text-xs text-gray-600 mb-1">年利回り</div>
              <div className="font-bold text-lg text-blue-600">8.9%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}