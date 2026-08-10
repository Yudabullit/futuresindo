import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import { Search } from "@/components/ui/search";

import {
  Trash2,
  Download,
  RefreshCw,
} from "lucide-react";

import { XlsxTable } from "@/components/ui/xlsx-table";

interface HistoryRecord {
  id: string;

  source_id: string;
  source_table: "barang_masuk" | "penjualan";

  created_at: string;

  transaction_number: string;
  invoice_number: string;

  transaction_type:
    | "BARANG_MASUK"
    | "PENJUALAN";

  customer_name?: string;
  supplier_name?: string;

  product_id?: string;
  product_name?: string;
  product_code?: string;

  qty: number;
  price: number;
  total_price: number;

  payment_method?: string;

  status?: string;
  notes?: string;

  user_id?: string;
}

const HistoryTransaksi = () => {
  const [history, setHistory] = useState<
    HistoryRecord[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [monthFilter, setMonthFilter] =
    useState("");

  const [yearFilter, setYearFilter] =
    useState("");

  const [typeFilter, setTypeFilter] =
    useState("");

  const [productFilter, setProductFilter] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const [userFilter, setUserFilter] =
    useState("");

  const [sortOrder, setSortOrder] =
    useState<"asc" | "desc">("desc");

  const [page, setPage] =
    useState(1);

  const rowsPerPage = 10;

  const [products, setProducts] =
    useState<any[]>([]);

  const [users, setUsers] =
    useState<any[]>([]);

  const { toast } = useToast();

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const years = Array.from(
    { length: 10 },
    (_, i) =>
      new Date().getFullYear() - 5 + i
  );

  /*
   * =========================================================
   * FETCH HISTORY DARI BARANG MASUK + PENJUALAN
   * =========================================================
   *
   * TIDAK lagi bergantung kepada transaction_history.
   *
   * Setiap row dari barang_masuk / penjualan akan menjadi
   * satu row di History Transaksi.
   *
   * Jadi:
   *
   * Invoice INV-001
   * Product A
   * Product B
   * Product C
   *
   * akan tampil 3 row.
   */

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      /*
       * ============================
       * BARANG MASUK
       * ============================
       */

      const {
        data: barangMasukData,
        error: barangMasukError,
      } = await supabase
        .from("barang_masuk")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (barangMasukError) {
        throw barangMasukError;
      }

      /*
       * ============================
       * PENJUALAN
       * ============================
       */

      const {
        data: penjualanData,
        error: penjualanError,
      } = await supabase
        .from("penjualan")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (penjualanError) {
        throw penjualanError;
      }

      /*
       * ============================
       * CONVERT BARANG MASUK
       * ============================
       */

      const barangMasukHistory: HistoryRecord[] =
        (barangMasukData || []).map(
          (item: any) => ({
            id: `barang_masuk-${item.id}`,

            source_id: item.id,

            source_table:
              "barang_masuk",

            created_at:
              item.created_at ||
              new Date().toISOString(),

            transaction_number:
              item.transaction_number ||
              "",

            invoice_number:
              item.invoice_number ||
              "",

            transaction_type:
              "BARANG_MASUK",

            supplier_name:
              item.supplier_name ||
              "",

            customer_name: "",

            product_id:
              item.product_id ||
              "",

            product_name:
              item.product_name ||
              "",

            product_code:
              item.product_code ||
              "",

            qty:
              Number(item.qty) || 0,

            price:
              Number(item.price) || 0,

            total_price:
              Number(item.total_price) || 0,

            payment_method:
              item.payment_method ||
              "",

            status:
              item.status ||
              "",

            notes:
              item.notes ||
              "",

            user_id:
              item.user_id ||
              "",
          })
        );

      /*
       * ============================
       * CONVERT PENJUALAN
       * ============================
       */

      const penjualanHistory: HistoryRecord[] =
        (penjualanData || []).map(
          (item: any) => ({
            id: `penjualan-${item.id}`,

            source_id: item.id,

            source_table:
              "penjualan",

            created_at:
              item.created_at ||
              new Date().toISOString(),

            transaction_number:
              item.transaction_number ||
              "",

            invoice_number:
              item.invoice_number ||
              "",

            transaction_type:
              "PENJUALAN",

            customer_name:
              item.customer_name ||
              "",

            supplier_name: "",

            product_id:
              item.product_id ||
              "",

            product_name:
              item.product_name ||
              "",

            product_code:
              item.product_code ||
              "",

            qty:
              Number(item.qty) || 0,

            price:
              Number(item.price) || 0,

            total_price:
              Number(item.total_price) || 0,

            payment_method:
              item.payment_method ||
              "",

            status:
              item.status ||
              "",

            notes:
              item.notes ||
              "",

            user_id:
              item.user_id ||
              "",
          })
        );

      /*
       * ============================
       * GABUNGKAN
       * ============================
       */

      const combinedHistory = [
        ...barangMasukHistory,
        ...penjualanHistory,
      ];

      /*
       * ============================
       * SORT CREATED AT
       * ============================
       */

      combinedHistory.sort(
        (a, b) => {
          const dateA =
            new Date(
              a.created_at
            ).getTime();

          const dateB =
            new Date(
              b.created_at
            ).getTime();

          return sortOrder === "asc"
            ? dateA - dateB
            : dateB - dateA;
        }
      );

      setHistory(
        combinedHistory
      );

      /*
       * Kembali ke page 1 setelah refresh
       */

      setPage(1);
    } catch (err: any) {
      console.error(
        "History error:",
        err
      );

      setError(
        err.message ||
          "Failed to load transaction history"
      );

      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  /*
   * =========================================================
   * FETCH PRODUCTS
   * =========================================================
   */

  useEffect(() => {
    const fetchProducts =
      async () => {
        try {
          const {
            data,
            error,
          } = await supabase
            .from("products")
            .select("*")
            .order(
              "description",
              {
                ascending: true,
              }
            );

          if (error) {
            throw error;
          }

          setProducts(
            data || []
          );
        } catch (err: any) {
          console.error(
            "Products error:",
            err.message
          );
        }
      };

    fetchProducts();
  }, []);

  /*
   * =========================================================
   * FETCH USERS
   * =========================================================
   */

  useEffect(() => {
    const fetchUsers =
      async () => {
        try {
          const {
            data,
            error,
          } = await supabase
            .from("users")
            .select("*");

          if (error) {
            throw error;
          }

          setUsers(
            data || []
          );
        } catch (err: any) {
          console.error(
            "Users error:",
            err.message
          );
        }
      };

    fetchUsers();
  }, []);

  /*
   * =========================================================
   * INITIAL FETCH
   * =========================================================
   */

  useEffect(() => {
    fetchHistory();
  }, [sortOrder]);

  /*
   * =========================================================
   * FILTER HISTORY
   * =========================================================
   */

  const filteredHistory =
    useMemo(() => {
      let result = [
        ...history,
      ];

      /*
       * SEARCH
       */

      if (searchTerm.trim()) {
        const search =
          searchTerm
            .toLowerCase()
            .trim();

        result =
          result.filter(
            (record) =>
              (
                record.transaction_number ||
                ""
              )
                .toLowerCase()
                .includes(search) ||

              (
                record.invoice_number ||
                ""
              )
                .toLowerCase()
                .includes(search) ||

              (
                record.product_name ||
                ""
              )
                .toLowerCase()
                .includes(search) ||

              (
                record.product_code ||
                ""
              )
                .toLowerCase()
                .includes(search) ||

              (
                record.customer_name ||
                ""
              )
                .toLowerCase()
                .includes(search) ||

              (
                record.supplier_name ||
                ""
              )
                .toLowerCase()
                .includes(search)
          );
      }

      /*
       * MONTH
       */

      if (
        monthFilter &&
        monthFilter !== "ALL"
      ) {
        const monthNumber =
          months.indexOf(
            monthFilter
          );

        result =
          result.filter(
            (record) => {
              const date =
                new Date(
                  record.created_at
                );

              return (
                date.getMonth() ===
                monthNumber
              );
            }
          );
      }

      /*
       * YEAR
       */

      if (
        yearFilter &&
        yearFilter !== "ALL"
      ) {
        const yearNumber =
          Number(
            yearFilter
          );

        result =
          result.filter(
            (record) => {
              const date =
                new Date(
                  record.created_at
                );

              return (
                date.getFullYear() ===
                yearNumber
              );
            }
          );
      }

      /*
       * TYPE
       */

      if (
        typeFilter &&
        typeFilter !== "ALL"
      ) {
        result =
          result.filter(
            (record) =>
              record.transaction_type ===
              typeFilter
          );
      }

      /*
       * PRODUCT
       */

      if (
        productFilter &&
        productFilter !== "ALL"
      ) {
        result =
          result.filter(
            (record) =>
              record.product_id ===
              productFilter
          );
      }

      /*
       * STATUS
       */

      if (
        statusFilter &&
        statusFilter !== "ALL"
      ) {
        result =
          result.filter(
            (record) =>
              record.status ===
              statusFilter
          );
      }

      /*
       * USER
       */

      if (
        userFilter &&
        userFilter !== "ALL"
      ) {
        result =
          result.filter(
            (record) =>
              record.user_id ===
              userFilter
          );
      }

      /*
       * SORT
       */

      result.sort(
        (a, b) => {
          const dateA =
            new Date(
              a.created_at
            ).getTime();

          const dateB =
            new Date(
              b.created_at
            ).getTime();

          return sortOrder === "asc"
            ? dateA - dateB
            : dateB - dateA;
        }
      );

      return result;
    }, [
      history,
      searchTerm,
      monthFilter,
      yearFilter,
      typeFilter,
      productFilter,
      statusFilter,
      userFilter,
      sortOrder,
    ]);

  /*
   * =========================================================
   * PAGINATION
   * =========================================================
   */

  const totalPages =
    Math.ceil(
      filteredHistory.length /
        rowsPerPage
    ) || 1;

  const paginatedHistory =
    filteredHistory.slice(
      (page - 1) *
        rowsPerPage,

      page *
        rowsPerPage
    );

  /*
   * =========================================================
   * RESET PAGE SAAT FILTER BERUBAH
   * =========================================================
   */

  useEffect(() => {
    setPage(1);
  }, [
    searchTerm,
    monthFilter,
    yearFilter,
    typeFilter,
    productFilter,
    statusFilter,
    userFilter,
  ]);

  /*
   * =========================================================
   * DELETE
   * =========================================================
   *
   * Karena History sekarang berasal langsung dari
   * barang_masuk / penjualan, delete akan menghapus
   * row sumbernya.
   *
   * Ini membuat History benar-benar sinkron.
   */

  const handleDeleteHistory =
    async (
      record: HistoryRecord
    ) => {
      if (
        !window.confirm(
          `Are you sure you want to delete this ${
            record.transaction_type ===
            "BARANG_MASUK"
              ? "barang masuk"
              : "penjualan"
          } record?`
        )
      ) {
        return;
      }

      try {
        const table =
          record.source_table;

        const {
          error,
        } = await supabase
          .from(table)
          .delete()
          .eq(
            "id",
            record.source_id
          );

        if (error) {
          throw error;
        }

        await fetchHistory();

        toast({
          title:
            "Success",

          description:
            "Transaction record deleted successfully",
        });
      } catch (err: any) {
        console.error(err);

        toast({
          title:
            "Error",

          description:
            err.message ||
            "Failed to delete transaction record",

          variant:
            "destructive",
        });
      }
    };

  /*
   * =========================================================
   * FORMAT CURRENCY
   * =========================================================
   */

  const formatCurrency = (
    value: number
  ) => {
    return `Rp ${Number(
      value || 0
    ).toLocaleString(
      "id-ID"
    )}`;
  };

  /*
   * =========================================================
   * FORMAT DATE
   * =========================================================
   */

  const formatDate = (
    value?: string
  ) => {
    if (!value) {
      return "-";
    }

    return new Date(
      value
    ).toLocaleDateString(
      "id-ID"
    );
  };

  /*
   * =========================================================
   * FORMAT TIME
   * =========================================================
   */

  const formatTime = (
    value?: string
  ) => {
    if (!value) {
      return "-";
    }

    return new Date(
      value
    ).toLocaleTimeString(
      "id-ID"
    );
  };

  /*
   * =========================================================
   * UI
   * =========================================================
   */

  return (
    <div className="space-y-6">

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">

        <h1 className="text-2xl font-bold">
          History Transaksi
        </h1>

        <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">

          {/* REFRESH */}

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              fetchHistory()
            }
          >
            <RefreshCw className="mr-2 h-4 w-4" />

            Refresh
          </Button>

          {/* EXPORT */}

          <XlsxTable
            data={
              filteredHistory
            }
            columns={[
              {
                header:
                  "Date",
                key:
                  "created_at",
              },

              {
                header:
                  "Transaction Number",
                key:
                  "transaction_number",
              },

              {
                header:
                  "Invoice",
                key:
                  "invoice_number",
              },

              {
                header:
                  "Transaction Type",
                key:
                  "transaction_type",
              },

              {
                header:
                  "Supplier",
                key:
                  "supplier_name",
              },

              {
                header:
                  "Customer",
                key:
                  "customer_name",
              },

              {
                header:
                  "Product",
                key:
                  "product_name",
              },

              {
                header:
                  "Code",
                key:
                  "product_code",
              },

              {
                header:
                  "Qty",
                key:
                  "qty",
              },

              {
                header:
                  "Price",
                key:
                  "price",
              },

              {
                header:
                  "Total Price",
                key:
                  "total_price",
              },

              {
                header:
                  "Payment",
                key:
                  "payment_method",
              },

              {
                header:
                  "Status",
                key:
                  "status",
              },
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
      </div>

      {/* ================================================= */}
      {/* SEARCH */}
      {/* ================================================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        <Search
          value={
            searchTerm
          }
          onChange={(e) =>
            setSearchTerm(
              e.target.value
            )
          }
          placeholder="Search transaction, invoice, product..."
          className="w-full"
        />

        {/* MONTH */}

        <Select
          value={
            monthFilter
          }
          onValueChange={
            setMonthFilter
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Month" />
          </SelectTrigger>

          <SelectContent>

            <SelectItem value="ALL">
              All Months
            </SelectItem>

            {months.map(
              (
                month,
                index
              ) => (
                <SelectItem
                  key={index}
                  value={month}
                >
                  {month}
                </SelectItem>
              )
            )}

          </SelectContent>
        </Select>

        {/* YEAR */}

        <Select
          value={
            yearFilter
          }
          onValueChange={
            setYearFilter
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Year" />
          </SelectTrigger>

          <SelectContent>

            <SelectItem value="ALL">
              All Years
            </SelectItem>

            {years.map(
              (year) => (
                <SelectItem
                  key={year}
                  value={String(
                    year
                  )}
                >
                  {year}
                </SelectItem>
              )
            )}

          </SelectContent>
        </Select>

        {/* TYPE */}

        <Select
          value={
            typeFilter
          }
          onValueChange={
            setTypeFilter
          }
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

      {/* ================================================= */}
      {/* FILTER BARIS KEDUA */}
      {/* ================================================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* PRODUCT */}

        <Select
          value={
            productFilter
          }
          onValueChange={
            setProductFilter
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Product" />
          </SelectTrigger>

          <SelectContent>

            <SelectItem value="ALL">
              All Products
            </SelectItem>

            {products.map(
              (
                product
              ) => (
                <SelectItem
                  key={
                    product.id
                  }
                  value={
                    product.id
                  }
                >
                  {product.code
                    ? `${product.code} - `
                    : ""}
                  {
                    product.description
                  }
                </SelectItem>
              )
            )}

          </SelectContent>
        </Select>

        {/* STATUS */}

        <Select
          value={
            statusFilter
          }
          onValueChange={
            setStatusFilter
          }
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

        {/* USER */}

        <Select
          value={
            userFilter
          }
          onValueChange={
            setUserFilter
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="User" />
          </SelectTrigger>

          <SelectContent>

            <SelectItem value="ALL">
              All Users
            </SelectItem>

            {users.map(
              (
                user
              ) => (
                <SelectItem
                  key={
                    user.id
                  }
                  value={
                    user.id
                  }
                >
                  {
                    user.username
                  }
                </SelectItem>
              )
            )}

          </SelectContent>
        </Select>

        {/* SORT */}

        <div className="flex items-center justify-end">

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setSortOrder(
                sortOrder ===
                  "asc"
                  ? "desc"
                  : "asc"
              )
            }
          >
            Sort: Date{" "}
            {sortOrder ===
            "asc"
              ? "↑"
              : "↓"}
          </Button>

        </div>

      </div>

      {/* ================================================= */}
      {/* ERROR */}
      {/* ================================================= */}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">

          <p>
            {error}
          </p>

        </div>
      )}

      {/* ================================================= */}
      {/* LOADING */}
      {/* ================================================= */}

      {loading && (
        <div className="text-center py-10 text-gray-500">
          Loading transaction history...
        </div>
      )}

      {/* ================================================= */}
      {/* EMPTY */}
      {/* ================================================= */}

      {!loading &&
        filteredHistory.length ===
          0 && (
          <div className="text-center py-10 text-gray-500">
            No history records found
          </div>
        )}

      {/* ================================================= */}
      {/* TABLE */}
      {/* ================================================= */}

      {!loading &&
        filteredHistory.length >
          0 && (

          <div className="overflow-x-auto">

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

                  <TableCell className="font-semibold">
                    Invoice
                  </TableCell>

                  <TableCell className="font-semibold">
                    Type
                  </TableCell>

                  <TableCell className="font-semibold">
                    Supplier / Customer
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
                    Price
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

                {paginatedHistory.map(
                  (
                    record
                  ) => (

                    <TableRow
                      key={
                        record.id
                      }
                    >

                      {/* DATE */}

                      <TableCell>
                        {formatDate(
                          record.created_at
                        )}
                      </TableCell>

                      {/* TIME */}

                      <TableCell>
                        {formatTime(
                          record.created_at
                        )}
                      </TableCell>

                      {/* TRANSACTION */}

                      <TableCell className="font-medium">
                        {
                          record.transaction_number ||
                          "-"
                        }
                      </TableCell>

                      {/* INVOICE */}

                      <TableCell className="font-medium">
                        {
                          record.invoice_number ||
                          "-"
                        }
                      </TableCell>

                      {/* TYPE */}

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

                      {/* SUPPLIER / CUSTOMER */}

                      <TableCell>

                        {record.transaction_type ===
                        "BARANG_MASUK"
                          ? record.supplier_name ||
                            "-"
                          : record.customer_name ||
                            "-"}

                      </TableCell>

                      {/* PRODUCT */}

                      <TableCell>
                        {
                          record.product_name ||
                          "-"
                        }
                      </TableCell>

                      {/* CODE */}

                      <TableCell>
                        {
                          record.product_code ||
                          "-"
                        }
                      </TableCell>

                      {/* QTY */}

                      <TableCell className="text-right">
                        {Number(
                          record.qty ||
                            0
                        ).toLocaleString(
                          "id-ID"
                        )}
                      </TableCell>

                      {/* PRICE */}

                      <TableCell className="text-right">
                        {formatCurrency(
                          record.price
                        )}
                      </TableCell>

                      {/* TOTAL */}

                      <TableCell className="text-right font-medium">
                        {formatCurrency(
                          record.total_price
                        )}
                      </TableCell>

                      {/* PAYMENT */}

                      <TableCell>
                        {
                          record.payment_method ||
                          "-"
                        }
                      </TableCell>

                      {/* STATUS */}

                      <TableCell>

                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            record.status ===
                            "Barang Diterima"
                              ? "bg-green-100 text-green-800"
                              : record.status ===
                                "Received"
                              ? "bg-green-100 text-green-800"
                              : record.status ===
                                "Tidak Diterima"
                              ? "bg-red-100 text-red-800"
                              : record.status ===
                                "Sent"
                              ? "bg-blue-100 text-blue-800"
                              : record.status ===
                                "Prepared"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >

                          {
                            record.status ||
                            "-"
                          }

                        </span>

                      </TableCell>

                      {/* ACTION */}

                      <TableCell className="text-center">

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            handleDeleteHistory(
                              record
                            )
                          }
                          className="px-3"
                        >

                          <Trash2 className="h-4 w-4" />

                        </Button>

                      </TableCell>

                    </TableRow>

                  )
                )}

              </TableBody>

            </Table>

          </div>
        )}

      {/* ================================================= */}
      {/* PAGINATION */}
      {/* ================================================= */}

      {!loading &&
        filteredHistory.length >
          0 && (

          <Pagination>

            <PaginationContent>

              <PaginationItem>

                <PaginationPrevious
                  onClick={() =>
                    setPage(
                      (p) =>
                        Math.max(
                          p -
                            1,
                          1
                        )
                    )
                  }
                />

              </PaginationItem>

              {Array.from(
                {
                  length:
                    totalPages,
                }
              ).map(
                (
                  _,
                  index
                ) => {

                  const pageNumber =
                    index +
                    1;

                  return (
                    <PaginationItem
                      key={
                        pageNumber
                      }
                    >

                      <PaginationLink
                        isActive={
                          pageNumber ===
                          page
                        }
                        onClick={() =>
                          setPage(
                            pageNumber
                          )
                        }
                      >
                        {
                          pageNumber
                        }
                      </PaginationLink>

                    </PaginationItem>
                  );
                }
              )}

              <PaginationItem>

                <PaginationNext
                  onClick={() =>
                    setPage(
                      (p) =>
                        Math.min(
                          p +
                            1,
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
