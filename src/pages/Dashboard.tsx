import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, LineChart, PieChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, Line, Pie, Cell } from "recharts";
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead, TableCaption } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { XlsxTable } from "@/components/ui/xlsx-table";
import { Download } from "lucide-react";

const fetchDashboardData = async () => {
  const [products, barangMasuk, penjualan] = await Promise.all([
    supabase.from("products").select("*"),
    supabase.from("barang_masuk").select("*").eq("status", "Barang Diterima"),
    supabase.from("penjualan").select("*").eq("status", "Received"),
  ]);

  return {
    products: products.data || [],
    barangMasuk: barangMasuk.data || [],
    penjualan: penjualan.data || [],
  };
};

const Dashboard = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardData,
  });

  if (isLoading) return <div className="text-center py-10">Loading...</div>;
  if (error) return <div className="text-center py-10 text-red-500">Error loading data</div>;

  const { products, barangMasuk, penjualan } = data;

  // Calculate stats
  const totalProducts = products.length;
  const totalQuantity = products.reduce((sum, p) => sum + (p.qty || 0), 0);
  const totalInventoryValue = products.reduce(
    (sum, p) => sum + (p.qty || 0) * (p.price || 0),
    0
  );
  const totalBarangMasuk = barangMasuk.reduce(
    (sum, b) => sum + (b.qty || 0),
    0
  );
  const totalPenjualan = penjualan.reduce(
    (sum, p) => sum + (p.qty || 0),
    0
  );
  const lowStockProducts = products.filter((p) => (p.qty || 0) < 10).length;

  // Monthly data for charts
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
    masuk: Math.floor(Math.random() * 100),
    penjualan: Math.floor(Math.random() * 80),
  }));

  // Recent transactions
  const recentMasuk = [...barangMasuk]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
  const recentPenjualan = [...penjualan]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalProducts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalQuantity.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              Rp {totalInventoryValue.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Barang Masuk</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalBarangMasuk.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Penjualan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalPenjualan.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-500">{lowStockProducts}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium">Barang Masuk vs Penjualan</CardTitle>
              <Button variant="outline" size="sm" className="px-3">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <BarChart
              width={600}
              height={300}
              data={monthlyData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar name="Masuk" dataKey="masuk" barSize={20} fill="#4F46E5" />
              <Bar name="Penjualan" dataKey="penjualan" barSize={20} fill="#10B981" />
            </BarChart>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium">Monthly Transactions</CardTitle>
              <Button variant="outline" size="sm" className="px-3">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <LineChart
              width={600}
              height={300}
              data={monthlyData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="masuk" stroke="#4F46E5" strokeWidth={2} />
              <Line type="monotone" dataKey="penjualan" stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium">Recent Barang Masuk</CardTitle>
              <Button variant="outline" size="sm" className="px-3">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Qty</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMasuk.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {new Date(item.created_at).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell>{item.supplier_name || "-"}</TableCell>
                    <TableCell>{item.product_name || "-"}</TableCell>
                    <TableCell>{item.qty?.toLocaleString() || "0"}</TableCell>
                    <TableCell
                      className={`px-2 py-1 rounded-full text-xs ${
                        item.status === "Barang Diterima"
                          ? "bg-green-100 text-green-800"
                          : item.status === "Tidak Diterima"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {item.status}
                    </TableCell>
                  </TableRow>
                ))}
                {recentMasuk.length === 0 && (
                  <TableRow>
                    <TableCell colSpan="5" className="text-center py-4">
                      No recent barang masuk
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium">Recent Penjualan</CardTitle>
              <Button variant="outline" size="sm" className="px-3">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Qty</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPenjualan.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {new Date(item.created_at).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell>{item.customer_name || "-"}</TableCell>
                    <TableCell>{item.product_name || "-"}</TableCell>
                    <TableCell>{item.qty?.toLocaleString() || "0"}</TableCell>
                    <TableCell>{item.payment_method || "-"}</TableCell>
                    <TableCell
                      className={`px-2 py-1 rounded-full text-xs ${
                        item.status === "Received"
                          ? "bg-green-100 text-green-800"
                          : item.status === "Sent"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {item.status}
                    </TableCell>
                  </TableRow>
                ))}
                {recentPenjualan.length === 0 && (
                  <TableRow>
                    <TableCell colSpan="6" className="text-center py-4">
                      No recent penjualan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;