import { useState, useEffect } from "react";
import { Lock, Users, Ticket, DollarSign, ShoppingCart, LogOut, Eye, CreditCard, Trash2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Order {
  id: number;
  transaction_id: string;
  customer_name: string;
  customer_phone: string;
  quantity: number;
  total_price: number;
  payment_status: string;
  codes: string;
  created_at: string;
}

interface Stats {
  total_orders: number;
  total_titles: number;
  total_revenue: number;
  unique_customers: number;
}

interface User {
  id: number;
  phone: string;
  name: string;
  last_login: string;
  created_at: string;
}

interface Transaction {
  id: number;
  transaction_id: string;
  customer_name: string;
  customer_phone: string;
  quantity: number;
  total_price: number;
  pix_code: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

export default function Admin() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<"orders" | "users" | "pix">("orders");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [instagramSaved, setInstagramSaved] = useState(false);
  const [metaPixelId, setMetaPixelId] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [utmifyToken, setUtmifyToken] = useState("");
  const [clarityId, setClarityId] = useState("");
  const [trackingSaved, setTrackingSaved] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin", {
        headers: { Authorization: `Bearer ${password}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Senha incorreta");
      }

      setOrders(data.orders);
      setStats(data.stats);
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_token", password);
      // Fetch users, transactions and settings
      try {
        const [usersRes, txRes, settingsRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/transactions"),
          fetch("/api/settings"),
        ]);
        const usersData = await usersRes.json();
        const txData = await txRes.json();
        const settingsData = await settingsRes.json();
        setUsers(usersData.users || []);
        setTransactions(txData.transactions || []);
        if (settingsData.instagram_url) setInstagramUrl(settingsData.instagram_url);
        if (settingsData.meta_pixel_id) setMetaPixelId(settingsData.meta_pixel_id);
        if (settingsData.meta_access_token) setMetaAccessToken(settingsData.meta_access_token);
        if (settingsData.utmify_token) setUtmifyToken(settingsData.utmify_token);
        if (settingsData.clarity_id) setClarityId(settingsData.clarity_id);
      } catch {}
    } catch (err: any) {
      setError(err?.message || "Erro ao conectar");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchData = async (token: string) => {
    try {
      const res = await fetch("/api/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrders(data.orders);
      setStats(data.stats);
      setIsAuthenticated(true);
      try {
        const [usersRes, txRes, settingsRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/transactions"),
          fetch("/api/settings"),
        ]);
        const usersData = await usersRes.json();
        const txData = await txRes.json();
        const settingsData = await settingsRes.json();
        setUsers(usersData.users || []);
        setTransactions(txData.transactions || []);
        if (settingsData.instagram_url) setInstagramUrl(settingsData.instagram_url);
        if (settingsData.meta_pixel_id) setMetaPixelId(settingsData.meta_pixel_id);
        if (settingsData.meta_access_token) setMetaAccessToken(settingsData.meta_access_token);
        if (settingsData.utmify_token) setUtmifyToken(settingsData.utmify_token);
        if (settingsData.clarity_id) setClarityId(settingsData.clarity_id);
      } catch {}
    } catch {
      sessionStorage.removeItem("admin_token");
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_token");
    if (saved) {
      fetchData(saved);
    }
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword("");
    sessionStorage.removeItem("admin_token");
  };

  const handleRefresh = async () => {
    const token = sessionStorage.getItem("admin_token");
    if (token) {
      setIsLoading(true);
      await fetchData(token);
      setIsLoading(false);
    }
  };

  const handleSaveInstagram = async () => {
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagram_url: instagramUrl }),
      });
      setInstagramSaved(true);
      setTimeout(() => setInstagramSaved(false), 2000);
    } catch {}
  };

  const handleSaveTracking = async () => {
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meta_pixel_id: metaPixelId,
          meta_access_token: metaAccessToken,
          utmify_token: utmifyToken,
          clarity_id: clarityId,
        }),
      });
      setTrackingSaved(true);
      setTimeout(() => setTrackingSaved(false), 2000);
    } catch {}
  };

  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [selectedTx, setSelectedTx] = useState<Set<number>>(new Set());

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleSelectUser = (id: number) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAllUsers = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
    }
  };

  const deleteSelectedUsers = async () => {
    if (!confirm(`Deletar ${selectedUsers.size} usuário(s)?`)) return;
    for (const id of selectedUsers) {
      await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    }
    setUsers((prev) => prev.filter((u) => !selectedUsers.has(u.id)));
    setSelectedUsers(new Set());
  };

  const toggleSelectTx = (id: number) => {
    setSelectedTx((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAllTx = () => {
    if (selectedTx.size === transactions.length) {
      setSelectedTx(new Set());
    } else {
      setSelectedTx(new Set(transactions.map((t) => t.id)));
    }
  };

  const deleteSelectedTx = async () => {
    if (!confirm(`Deletar ${selectedTx.size} transação(ões)?`)) return;
    for (const id of selectedTx) {
      await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
    }
    setTransactions((prev) => prev.filter((t) => !selectedTx.has(t.id)));
    setSelectedTx(new Set());
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-gray-900/40 backdrop-blur-xl rounded-2xl max-w-sm w-full border border-gray-600/30 shadow-2xl animate-scaleIn">
          <div className="flex items-center justify-center gap-2 p-6 border-b border-gray-600/30">
            <Lock size={24} className="text-yellow-400" />
            <h1 className="text-xl font-bold text-white">Painel Admin</h1>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
              <label className="block text-yellow-400 text-sm font-bold mb-2">
                Senha de Acesso
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha"
                className="w-full bg-black/30 border border-gray-600/50 backdrop-blur-sm rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-yellow-400/50 transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <Button
              type="submit"
              disabled={isLoading || !password}
              className="w-full bg-yellow-400 text-black font-bold py-4 text-lg rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Verificando..." : "Entrar"}
            </Button>

            <a
              href="/"
              className="block text-center text-gray-400 text-sm hover:text-white transition-colors"
            >
              Voltar ao site
            </a>
          </form>
        </div>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-black border-b border-yellow-400/30 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-yellow-400" />
            <h1 className="font-bold text-lg text-yellow-400">Painel Admin</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              className="bg-gray-700 text-white hover:bg-gray-600 px-4 py-2 rounded-lg text-sm"
            >
              {isLoading ? "..." : "Atualizar"}
            </Button>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <LogOut size={18} />
              <span className="text-sm">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-600/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <ShoppingCart size={16} />
                Pedidos
              </div>
              <p className="text-2xl font-bold text-white">
                {stats.total_orders || 0}
              </p>
            </div>

            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-600/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Ticket size={16} />
                Títulos
              </div>
              <p className="text-2xl font-bold text-green-400">
                {stats.total_titles || 0}
              </p>
            </div>

            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-600/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <DollarSign size={16} />
                Receita
              </div>
              <p className="text-2xl font-bold text-green-400">
                R$ {Number(stats.total_revenue || 0).toFixed(2)}
              </p>
            </div>

            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-600/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Users size={16} />
                Clientes
              </div>
              <p className="text-2xl font-bold text-white">
                {stats.unique_customers || 0}
              </p>
            </div>
          </div>
        )}

        {/* Instagram Link */}
        <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-600/30 rounded-xl p-4">
          <label className="block text-gray-400 text-sm font-bold mb-2">
            Link do Instagram (seção final da página)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/seu_perfil"
              className="flex-1 bg-black/30 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-yellow-400/50 transition-colors text-sm"
            />
            <Button
              onClick={handleSaveInstagram}
              className="bg-yellow-400 text-black font-bold px-6 rounded-lg hover:bg-yellow-300 text-sm"
            >
              {instagramSaved ? "Salvo!" : "Salvar"}
            </Button>
          </div>
        </div>

        {/* Tracking Settings */}
        <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-600/30 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings size={18} className="text-yellow-400" />
            <h3 className="text-white font-bold">Rastreamento & Integrações</h3>
          </div>

          {/* Meta CAPI */}
          <div className="space-y-2">
            <label className="block text-gray-400 text-sm font-bold">Meta CAPI (Facebook Pixel)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="text"
                value={metaPixelId}
                onChange={(e) => setMetaPixelId(e.target.value)}
                placeholder="ID do Pixel (ex: 123456789012345)"
                className="bg-black/30 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-yellow-400/50 transition-colors text-sm"
              />
              <input
                type="text"
                value={metaAccessToken}
                onChange={(e) => setMetaAccessToken(e.target.value)}
                placeholder="Token de Acesso (CAPI)"
                className="bg-black/30 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-yellow-400/50 transition-colors text-sm"
              />
            </div>
          </div>

          {/* Utmify */}
          <div className="space-y-2">
            <label className="block text-gray-400 text-sm font-bold">Utmify</label>
            <input
              type="text"
              value={utmifyToken}
              onChange={(e) => setUtmifyToken(e.target.value)}
              placeholder="Token Utmify"
              className="w-full bg-black/30 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-yellow-400/50 transition-colors text-sm"
            />
          </div>

          {/* Microsoft Clarity */}
          <div className="space-y-2">
            <label className="block text-gray-400 text-sm font-bold">Microsoft Clarity</label>
            <input
              type="text"
              value={clarityId}
              onChange={(e) => setClarityId(e.target.value)}
              placeholder="ID do Projeto (ex: vwfmrsgeqj)"
              className="w-full bg-black/30 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-yellow-400/50 transition-colors text-sm"
            />
          </div>

          <Button
            onClick={handleSaveTracking}
            className="bg-yellow-400 text-black font-bold px-6 py-2.5 rounded-lg hover:bg-yellow-300 text-sm"
          >
            {trackingSaved ? "Salvo!" : "Salvar Rastreamento"}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-5 py-3 rounded-lg font-bold transition-colors text-sm ${
              activeTab === "orders"
                ? "bg-yellow-400 text-black"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            Pedidos ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("pix")}
            className={`px-5 py-3 rounded-lg font-bold transition-colors text-sm ${
              activeTab === "pix"
                ? "bg-yellow-400 text-black"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            PIX Gerados ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-5 py-3 rounded-lg font-bold transition-colors text-sm ${
              activeTab === "users"
                ? "bg-yellow-400 text-black"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            Usuários ({users.length})
          </button>
        </div>

        {/* Orders Table */}
        {activeTab === "orders" && (
        <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-600/30 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-600/30">
            <h2 className="text-lg font-bold text-white">
              Todos os Pedidos ({orders.length})
            </h2>
          </div>

          {orders.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Nenhum pedido encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop table */}
              <table className="w-full text-sm hidden md:table">
                <thead>
                  <tr className="border-b border-gray-600/30 text-gray-400">
                    <th className="text-left p-3">ID</th>
                    <th className="text-left p-3">Data</th>
                    <th className="text-left p-3">Cliente</th>
                    <th className="text-left p-3">Telefone</th>
                    <th className="text-center p-3">Qtd</th>
                    <th className="text-right p-3">Valor</th>
                    <th className="text-center p-3">Status</th>
                    <th className="text-center p-3">Códigos</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-gray-600/10 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="p-3 text-gray-400">#{order.id}</td>
                      <td className="p-3 text-gray-300">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="p-3 text-white font-medium">
                        {order.customer_name}
                      </td>
                      <td className="p-3 text-gray-300">
                        {order.customer_phone}
                      </td>
                      <td className="p-3 text-center text-green-400 font-bold">
                        {order.quantity}
                      </td>
                      <td className="p-3 text-right text-green-400 font-bold">
                        R$ {Number(order.total_price).toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            order.payment_status === "paid"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {order.payment_status === "paid"
                            ? "Pago"
                            : "Pendente"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() =>
                            setExpandedOrder(
                              expandedOrder === order.id ? null : order.id
                            )
                          }
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        {expandedOrder === order.id && order.codes && (
                          <div className="absolute mt-2 bg-gray-800 border border-gray-600/50 rounded-lg p-3 shadow-xl z-10 text-left">
                            <p className="text-xs text-gray-400 mb-1">
                              Códigos:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {order.codes.split(",").map((code, i) => (
                                <span
                                  key={i}
                                  className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-mono"
                                >
                                  {code}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3 p-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-black/30 border border-gray-600/30 rounded-xl p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs">
                        #{order.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          order.payment_status === "paid"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {order.payment_status === "paid" ? "Pago" : "Pendente"}
                      </span>
                    </div>

                    <div>
                      <p className="text-white font-bold">
                        {order.customer_name}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {order.customer_phone}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">
                        {order.quantity} título
                        {order.quantity !== 1 ? "s" : ""}
                      </span>
                      <span className="text-green-400 font-bold">
                        R$ {Number(order.total_price).toFixed(2)}
                      </span>
                    </div>

                    <p className="text-gray-500 text-xs">
                      {formatDate(order.created_at)}
                    </p>

                    {order.codes && (
                      <div className="pt-2 border-t border-gray-600/20">
                        <p className="text-xs text-gray-400 mb-1">Códigos:</p>
                        <div className="flex flex-wrap gap-1">
                          {order.codes.split(",").map((code, i) => (
                            <span
                              key={i}
                              className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-mono"
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        {/* Users Table */}
        {activeTab === "users" && (
        <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-600/30 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-600/30 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              Usuários ({users.length})
            </h2>
            {selectedUsers.size > 0 && (
              <button
                onClick={deleteSelectedUsers}
                className="flex items-center gap-1 bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-red-500/30 transition-colors"
              >
                <Trash2 size={14} />
                Deletar ({selectedUsers.size})
              </button>
            )}
          </div>

          {users.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Nenhum usuário encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm hidden md:table">
                <thead>
                  <tr className="border-b border-gray-600/30 text-gray-400">
                    <th className="p-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === users.length && users.length > 0}
                        onChange={toggleSelectAllUsers}
                        className="accent-yellow-400"
                      />
                    </th>
                    <th className="text-left p-3">ID</th>
                    <th className="text-left p-3">Nome</th>
                    <th className="text-left p-3">Telefone</th>
                    <th className="text-left p-3">Cadastro</th>
                    <th className="text-left p-3">Último Login</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className={`border-b border-gray-600/10 hover:bg-gray-800/30 transition-colors ${selectedUsers.has(user.id) ? "bg-yellow-400/5" : ""}`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleSelectUser(user.id)}
                          className="accent-yellow-400"
                        />
                      </td>
                      <td className="p-3 text-gray-400">#{user.id}</td>
                      <td className="p-3 text-white font-medium">{user.name || "-"}</td>
                      <td className="p-3 text-gray-300">{user.phone}</td>
                      <td className="p-3 text-gray-300">{formatDate(user.created_at)}</td>
                      <td className="p-3 text-gray-300">{formatDate(user.last_login)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="md:hidden space-y-3 p-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={`bg-black/30 border rounded-xl p-4 space-y-2 ${selectedUsers.has(user.id) ? "border-yellow-400/50" : "border-gray-600/30"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleSelectUser(user.id)}
                          className="accent-yellow-400"
                        />
                        <span className="text-gray-400 text-xs">#{user.id}</span>
                      </div>
                    </div>
                    <p className="text-white font-bold">{user.name || "-"}</p>
                    <p className="text-gray-300 text-sm">{user.phone}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Cadastro: {formatDate(user.created_at)}</span>
                      <span>Login: {formatDate(user.last_login)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        {/* PIX Transactions Table */}
        {activeTab === "pix" && (
        <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-600/30 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-600/30 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              PIX Gerados ({transactions.length})
            </h2>
            {selectedTx.size > 0 && (
              <button
                onClick={deleteSelectedTx}
                className="flex items-center gap-1 bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-red-500/30 transition-colors"
              >
                <Trash2 size={14} />
                Deletar ({selectedTx.size})
              </button>
            )}
          </div>

          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Nenhuma transação encontrada
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm hidden md:table">
                <thead>
                  <tr className="border-b border-gray-600/30 text-gray-400">
                    <th className="p-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedTx.size === transactions.length && transactions.length > 0}
                        onChange={toggleSelectAllTx}
                        className="accent-yellow-400"
                      />
                    </th>
                    <th className="text-left p-3">ID</th>
                    <th className="text-left p-3">Data</th>
                    <th className="text-left p-3">Cliente</th>
                    <th className="text-left p-3">Telefone</th>
                    <th className="text-center p-3">Qtd</th>
                    <th className="text-right p-3">Valor</th>
                    <th className="text-center p-3">Status</th>
                    <th className="text-left p-3">Pago em</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className={`border-b border-gray-600/10 hover:bg-gray-800/30 transition-colors ${selectedTx.has(tx.id) ? "bg-yellow-400/5" : ""}`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedTx.has(tx.id)}
                          onChange={() => toggleSelectTx(tx.id)}
                          className="accent-yellow-400"
                        />
                      </td>
                      <td className="p-3 text-gray-400">#{tx.id}</td>
                      <td className="p-3 text-gray-300">{formatDate(tx.created_at)}</td>
                      <td className="p-3 text-white font-medium">{tx.customer_name}</td>
                      <td className="p-3 text-gray-300">{tx.customer_phone}</td>
                      <td className="p-3 text-center text-green-400 font-bold">{tx.quantity}</td>
                      <td className="p-3 text-right text-green-400 font-bold">
                        R$ {Number(tx.total_price).toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          tx.status === "paid"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}>
                          {tx.status === "paid" ? "Pago" : "Pendente"}
                        </span>
                      </td>
                      <td className="p-3 text-gray-300">{tx.paid_at ? formatDate(tx.paid_at) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="md:hidden space-y-3 p-4">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className={`bg-black/30 border rounded-xl p-4 space-y-2 ${selectedTx.has(tx.id) ? "border-yellow-400/50" : "border-gray-600/30"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedTx.has(tx.id)}
                          onChange={() => toggleSelectTx(tx.id)}
                          className="accent-yellow-400"
                        />
                        <span className="text-gray-400 text-xs">#{tx.id}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        tx.status === "paid"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {tx.status === "paid" ? "Pago" : "Pendente"}
                      </span>
                    </div>
                    <p className="text-white font-bold">{tx.customer_name}</p>
                    <p className="text-gray-400 text-sm">{tx.customer_phone}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">{tx.quantity} título{tx.quantity !== 1 ? "s" : ""}</span>
                      <span className="text-green-400 font-bold">R$ {Number(tx.total_price).toFixed(2)}</span>
                    </div>
                    <p className="text-gray-500 text-xs">{formatDate(tx.created_at)}</p>
                    {tx.paid_at && <p className="text-green-400/60 text-xs">Pago: {formatDate(tx.paid_at)}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}
      </main>
    </div>
  );
}
