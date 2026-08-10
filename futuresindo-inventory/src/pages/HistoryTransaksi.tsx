import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Search } from "@/components/ui/search";
import { Trash2, Download } from "lucide-react";
import { XlsxTable } from "@/components/ui/xlsx-table";

const HistoryTransaksi = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [sortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const { toast } = useToast();

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from(
    { length: 10 },
    (_, i) => new Date().getFullYear() - 5 + i
  );

  const fetchHistory = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("transaction_history")
        .select("*");

      if (searchTerm) {
        query = query.or(
          `transaction_number.ilike.%${searchTerm}%,product_name.ilike.%${searchTerm}%`
        );
      }

      if (monthFilter && monthFilter !== "ALL") {
        const monthNum = months.indexOf(monthFilter) + 1;
        const currentYear =
          yearFilter && yearFilter !== "ALL"
            ? yearFilter
            : new Date().getFullYear();

        query = query
          .gte(
            "created_at",
            `${currentYear}-${monthNum
              .toString()
              .padStart(2, "0")}-01`
          )
          .lt(
            "created_at",
            `${currentYear}-${(monthNum + 1)
              .toString()
              .padStart(2, "0")}-01`
          );
      }

      if (yearFilter && yearFilter !== "ALL") {
        query = query
          .gte("created_at", `${yearFilter}-01-01`)
          .lt(
            "created_at",
            `${Number(yearFilter) + 1}-01-01`
          );
      }

      if (typeFilter && typeFilter !== "ALL") {
        query = query.eq("transaction_type", typeFilter);
      }

      if (productFilter && productFilter !== "ALL") {
        query = query.eq("product_id", productFilter);
      }

      if (statusFilter && statusFilter !== "ALL") {
        query = query.eq("status", statusFilter);
      }

      if (userFilter && userFilter !== "ALL") {
        query = query.eq("user_id", userFilter);
      }

      query = query.order(sortBy, {
        ascending: sortOrder === "asc"
      });

      const { data, error } = await query;

      if (error) throw error;

      setHistory(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this history record?"
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("transaction_history")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchHistory();

      toast({
        title: "Success",
        description: "History record deleted successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description:
          err.message || "Failed to delete history record",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [
    searchTerm,
    monthFilter,
    yearFilter,
    typeFilter,
    productFilter,
    statusFilter,
    userFilter,
    sortOrder
  ]);

  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*");

        if (error) throw error;

        setProducts(data || []);
      } catch (err: any) {
        console.error(err.message);
      }
    };

    fetchProducts();
  }, []);

  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*");

        if (error) throw error;

        setUsers(data || []);
      } catch (err: any) {
        console.error(err.message);
      }
    };

    fetchUsers();
  }, []);

  const totalPages =
    Math.ceil(history.length / rowsPerPage) || 1;

  const paginatedHistory = history.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          History Transaksi
        </h1>

        <XlsxTable
          data={history}
          columns={[
            { header: "Date", key: "created_at" },
            {
              header: "Transaction Number",
              key: "transaction_number"
            },

            // INVOICE DITAMBAHKAN DI EXPORT
            {
              header: "Invoice",
              key: "invoice_number"
            },

            {
              header: "Transaction Type",
              key: "transaction_type"
            },
            { header: "Product", key: "product_name" },
            { header: "Code", key: "product_code" },
            { header: "Qty", key: "qty" },
            { header: "Total Price", key: "total_price" },
            { header: "Payment", key: "payment_method" },
            { header: "Status", key: "status" },
          ]}
          filename="history-transaksi.xlsx"
          className="flex items-center"
        >
          <Button
            variant="outline"
            size="sm"
            className="px-3"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </XlsxTable>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        <Search
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search history..."
          className="w-full"
        />

        <Select
          value={monthFilter}
          onValueChange={setMonthFilter}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Month" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="ALL">
              All Months
            </SelectItem>

            {months.map((month, i) => (
              <SelectItem key={i} value={month}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={yearFilter}
          onValueChange={setYearFilter}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Year" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="ALL">
              All Years
            </SelectItem>

            {years.map((year) => (
              <SelectItem
                key={year}
                value={String(year)}
              >
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={typeFilter}
          onValueChange={setTypeFilter}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Transaction Type" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="ALL">
              All Types
            </SelectItem>

            <SelectItem value="BARANG_MASUK">
              Barang Masuk
            </SelectItem>

            <SelectItem value="PENJUALAN">
              Penjualan
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Select
          value={productFilter}
          onValueChange={setProductFilter}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Product" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="ALL">
              All Products
            </SelectItem>

            {products.map((product) => (
              <SelectItem
                key={product.id}
                value={product.id}
              >
                {product.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={setStatusFilter}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Status" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="ALL">
              All Status
            </SelectItem>

            <SelectItem value="Menunggu Konfirmasi">
              Menunggu Konfirmasi
            </SelectItem>

            <SelectItem value="Barang Diterima">
              Barang Diterima
            </SelectItem>

            <SelectItem value="Tidak Diterima">
              Tidak Diterima
            </SelectItem>

            <SelectItem value="Prepared">
              Prepared
            </SelectItem>

            <SelectItem value="Sent">
              Sent
            </SelectItem>

            <SelectItem value="Received">
              Received
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={userFilter}
          onValueChange={setUserFilter}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="User" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="ALL">
              All Users
            </SelectItem>

            {users.map((user) => (
              <SelectItem
                key={user.id}
                value={user.id}
              >
                {user.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setSortOrder(
                sortOrder === "asc"
                  ? "desc"
                  : "asc"
              )
            }
          >
            Sort: Date{" "}
            {sortOrder === "asc" ? "↑" : "↓"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p>{error}</p>
        </div>
      )}

      {!loading && history.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          No history records found
        </div>
      )}

      {!loading && history.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell className="font-semibold">
                Date
              </TableCell>

              <TableCell className="font-semibold">
                Time
              </TableCell>

              <TableCell className="font-semibold">
                Transaction No
              </TableCell>

              {/* INVOICE DITAMBAHKAN */}
              <TableCell className="font-semibold">
                Invoice
              </TableCell>

              <TableCell className="font-semibold">
                Type
              </TableCell>

              <TableCell className="font-semibold">
                Product
              </TableCell>

              <TableCell className="font-semibold">
                Code
              </TableCell>

              <TableCell className="text-right font-semibold">
                Qty
              </TableCell>

              <TableCell className="text-right font-semibold">
                Total Price
              </TableCell>

              <TableCell className="font-semibold">
                Payment
              </TableCell>

              <TableCell className="font-semibold">
                Status
              </TableCell>

              <TableCell className="text-center font-semibold">
                Actions
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedHistory.map((record) => (
              <TableRow key={record.id}>
                <TableCell>
                  {new Date(
                    record.created_at
                  ).toLocaleDateString("id-ID")}
                </TableCell>

                <TableCell>
                  {new Date(
                    record.created_at
                  ).toLocaleTimeString("id-ID")}
                </TableCell>

                <TableCell className="font-medium">
                  {record.transaction_number}
                </TableCell>

                {/* INVOICE DITAMBAHKAN */}
                <TableCell>
                  {record.invoice_number || "-"}
                </TableCell>

                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      record.transaction_type ===
                      "BARANG_MASUK"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {record.transaction_type ===
                    "BARANG_MASUK"
                      ? "BARANG MASUK"
                      : "PENJUALAN"}
                  </span>
                </TableCell>

                <TableCell>
                  {record.product_name || "-"}
                </TableCell>

                <TableCell>
                  {record.product_code || "-"}
                </TableCell>

                <TableCell className="text-right">
                  {record.qty?.toLocaleString() ||
                    "0"}
                </TableCell>

                <TableCell className="text-right">
                  Rp{" "}
                  {Number(
                    record.total_price || 0
                  ).toLocaleString()}
                </TableCell>

                <TableCell>
                  {record.payment_method || "-"}
                </TableCell>

                <TableCell>
                  {record.status || "-"}
                </TableCell>

                <TableCell className="flex justify-center">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      handleDeleteHistory(record.id)
                    }
                    className="px-3"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {!loading && history.length > 0 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() =>
                  setPage((p) =>
                    Math.max(p - 1, 1)
                  )
                }
              />
            </PaginationItem>

            {Array.from({
              length: totalPages
            }).map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  isActive={i + 1 === page}
                  onClick={() =>
                    setPage(i + 1)
                  }
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  setPage((p) =>
                    Math.min(
                      p + 1,
                      totalPages
                    )
                  )
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default HistoryTransaksi;