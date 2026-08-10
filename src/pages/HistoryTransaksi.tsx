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
import { Trash2, Download } from "lucide-react";
import { XlsxTable } from "@/components/ui/xlsx-table";

interface HistoryRecord {
  id: string;
  created_at: string;
  transaction_number?: string;
  invoice_number?: string;
  transaction_type?: string;
  product_id?: string;
  product_name?: string;
  product_code?: string;
  qty?: number;
  price?: number;
  total_price?: number;
  payment_method?: string;
  status?: string;
  user_id?: string;
}

interface InvoiceMap {
  [transactionNumber: string]: string;
}

interface GroupedHistory {
  key: string;
  transaction_number: string;
  invoice_number: string;
  records: HistoryRecord[];
}

const HistoryTransaksi = () => {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");

  const [sortOrder, setSortOrder] =
    useState<"asc" | "desc">("desc");

  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);

  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [invoiceMap, setInvoiceMap] =
    useState<InvoiceMap>({});

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
   * ============================================================
   * FETCH INVOICE DARI BARANG MASUK + PENJUALAN
   * ============================================================
   *
   * Tujuannya:
   *
   * transaction_history
   *       |
   *       +---- barang_masuk
   *       |
   *       +---- penjualan
   *
   * Kalau invoice_number di history kosong,
   * kita ambil invoice dari transaksi asal.
   *
   * ============================================================
   */

  const fetchInvoiceMap = async () => {
    try {
      const map: InvoiceMap = {};

      /*
       * BARANG MASUK
       */

      const {
        data: barangMasuk,
        error: barangMasukError,
      } = await supabase
        .from("barang_masuk")
        .select(
          "transaction_number, invoice_number"
        );

      if (!barangMasukError && barangMasuk) {
        barangMasuk.forEach((item: any) => {
          if (
            item.transaction_number &&
            item.invoice_number
          ) {
            map[item.transaction_number] =
              item.invoice_number;
          }
        });
      }

      /*
       * PENJUALAN
       */

      const {
        data: penjualan,
        error: penjualanError,
      } = await supabase
        .from("penjualan")
        .select(
          "transaction_number, invoice_number"
        );

      if (!penjualanError && penjualan) {
        penjualan.forEach((item: any) => {
          if (
            item.transaction_number &&
            item.invoice_number
          ) {
            map[item.transaction_number] =
              item.invoice_number;
          }
        });
      }

      setInvoiceMap(map);
    } catch (err) {
      console.error(
        "Failed to fetch invoice map:",
        err
      );
    }
  };

  /*
   * ============================================================
   * FETCH HISTORY
   * ============================================================
   */

  const fetchHistory = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("transaction_history")
        .select("*");

      /*
       * SEARCH
       */

      if (searchTerm) {
        query = query.or(
          `transaction_number.ilike.%${searchTerm}%,product_name.ilike.%${searchTerm}%,invoice_number.ilike.%${searchTerm}%`
        );
      }

      /*
       * MONTH
       */

      if (
        monthFilter &&
        monthFilter !== "ALL"
      ) {
        const monthNum =
          months.indexOf(monthFilter) + 1;

        const selectedYear =
          yearFilter &&
          yearFilter !== "ALL"
            ? Number(yearFilter)
            : new Date().getFullYear();

        const startDate = new Date(
          selectedYear,
          monthNum - 1,
          1
        );

        const endDate = new Date(
          selectedYear,
          monthNum,
          1
        );

        query = query
          .gte(
            "created_at",
            startDate.toISOString()
          )
          .lt(
            "created_at",
            endDate.toISOString()
          );
      }

      /*
       * YEAR
       */

      if (
        yearFilter &&
        yearFilter !== "ALL" &&
        monthFilter === ""
      ) {
        const year = Number(yearFilter);

        query = query
          .gte(
            "created_at",
            `${year}-01-01`
          )
          .lt(
            "created_at",
            `${year + 1}-01-01`
          );
      }

      /*
       * TYPE
       */

      if (
        typeFilter &&
        typeFilter !== "ALL"
      ) {
        query = query.eq(
          "transaction_type",
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
        query = query.eq(
          "product_id",
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
        query = query.eq(
          "status",
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
        query = query.eq(
          "user_id",
          userFilter
        );
      }

      /*
       * SORT
       */

      query = query.order("created_at", {
        ascending: sortOrder === "asc",
      });

      const {
        data,
        error,
      } = await query;

      if (error) {
        throw error;
      }

      setHistory(data || []);
      setError(null);
    } catch (err: any) {
      console.error(err);

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
   * ============================================================
   * INITIAL LOAD
   * ============================================================
   */

  useEffect(() => {
    fetchInvoiceMap();
  }, []);

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
    sortOrder,
  ]);

  /*
   * ============================================================
   * FETCH PRODUCTS
   * ============================================================
   */

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const {
          data,
          error,
        } = await supabase
          .from("products")
          .select("*");

        if (error) {
          throw error;
        }

        setProducts(data || []);
      } catch (err: any) {
        console.error(
          "Failed to fetch products:",
          err.message
        );
      }
    };

    fetchProducts();
  }, []);

  /*
   * ============================================================
   * FETCH USERS
   * ============================================================
   */

  useEffect(() => {
    const fetchUsers = async () => {
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

        setUsers(data || []);
      } catch (err: any) {
        console.error(
          "Failed to fetch users:",
          err.message
        );
      }
    };

    fetchUsers();
  }, []);

  /*
   * ============================================================
   * DELETE HISTORY
   * ============================================================
   */

  const handleDeleteHistory = async (
    id: string
  ) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this history record?"
      )
    ) {
      return;
    }

    try {
      const {
        error,
      } = await supabase
        .from("transaction_history")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      await fetchHistory();

      toast({
        title: "Success",
        description:
          "History record deleted successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description:
          err.message ||
          "Failed to delete history record",
        variant: "destructive",
      });
    }
  };

  /*
   * ============================================================
   * GET INVOICE
   * ============================================================
   *
   * Prioritas:
   *
   * 1. invoice_number dari transaction_history
   * 2. invoice_number dari barang_masuk / penjualan
   * 3. "-"
   *
   * ============================================================
   */

  const getInvoiceNumber = (
    record: HistoryRecord
  ) => {
    if (
      record.invoice_number &&
      record.invoice_number.trim() !== ""
    ) {
      return record.invoice_number;
    }

    if (
      record.transaction_number &&
      invoiceMap[record.transaction_number]
    ) {
      return invoiceMap[
        record.transaction_number
      ];
    }

    return "-";
  };

  /*
   * ============================================================
   * GROUP TRANSACTIONS
   * ============================================================
   *
   * INI BAGIAN UTAMA.
   *
   * Kalau:
   *
   * BM-001 + INV-001
   *
   * punya 3 produk:
   *
   * Product A
   * Product B
   * Product C
   *
   * Maka menjadi 1 GROUP.
   *
   * ============================================================
   */

  const groupedHistory =
    useMemo<GroupedHistory[]>(() => {
      const groups: GroupedHistory[] = [];

      const groupMap =
        new Map<string, GroupedHistory>();

      history.forEach((record) => {
        const transactionNumber =
          record.transaction_number || "-";

        const invoiceNumber =
          getInvoiceNumber(record);

        /*
         * Group berdasarkan:
         *
         * transaction_number + invoice_number
         */

        const key =
          `${transactionNumber}__${invoiceNumber}`;

        if (!groupMap.has(key)) {
          const group: GroupedHistory = {
            key,
            transaction_number:
              transactionNumber,
            invoice_number:
              invoiceNumber,
            records: [],
          };

          groupMap.set(key, group);
          groups.push(group);
        }

        groupMap
          .get(key)!
          .records.push(record);
      });

      return groups;
    }, [history, invoiceMap]);

  /*
   * ============================================================
   * PAGINATION
   * ============================================================
   *
   * Pagination sekarang berdasarkan ORDER,
   * bukan berdasarkan jumlah product.
   *
   * Jadi 1 invoice = 1 order.
   *
   * ============================================================
   */

  const totalPages =
    Math.ceil(
      groupedHistory.length /
        rowsPerPage
    ) || 1;

  const paginatedGroups =
    groupedHistory.slice(
      (page - 1) * rowsPerPage,
      page * rowsPerPage
    );

  /*
   * ============================================================
   * RESET PAGE
   * ============================================================
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
   * ============================================================
   * EXPORT DATA
   * ============================================================
   *
   * Export tetap semua PRODUCT.
   * Tidak digabung menjadi satu baris.
   *
   * ============================================================
   */

  const exportHistory =
    useMemo(() => {
      return history.map((record) => ({
        ...record,
        invoice_number:
          getInvoiceNumber(record),
      }));
    }, [history, invoiceMap]);

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            History Transaksi
          </h1>

          <p className="text-sm text-muted-foreground mt-1">
            Semua transaksi berdasarkan
            nomor transaksi dan invoice
          </p>
        </div>

        <XlsxTable
          data={exportHistory}
          columns={[
            {
              header: "Date",
              key: "created_at",
            },
            {
              header: "Transaction Number",
              key: "transaction_number",
            },
            {
              header: "Invoice",
              key: "invoice_number",
            },
            {
              header: "Transaction Type",
              key: "transaction_type",
            },
            {
              header: "Product",
              key: "product_name",
            },
            {
              header: "Code",
              key: "product_code",
            },
            {
              header: "Qty",
              key: "qty",
            },
            {
              header: "Price",
              key: "price",
            },
            {
              header: "Total Price",
              key: "total_price",
            },
            {
              header: "Payment",
              key: "payment_method",
            },
            {
              header: "Status",
              key: "status",
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

      {/* FILTER BAR 1 */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Search
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(
              e.target.value
            )
          }
          placeholder="Search transaction, invoice, product..."
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

            {months.map(
              (month, i) => (
                <SelectItem
                  key={i}
                  value={month}
                >
                  {month}
                </SelectItem>
              )
            )}
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

      {/* FILTER BAR 2 */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {products.map(
              (product) => (
                <SelectItem
                  key={product.id}
                  value={product.id}
                >
                  {product.description}
                </SelectItem>
              )
            )}
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

            {users.map(
              (user) => (
                <SelectItem
                  key={user.id}
                  value={user.id}
                >
                  {user.username}
                </SelectItem>
              )
            )}
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
            {sortOrder === "asc"
              ? "↑"
              : "↓"}
          </Button>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p>{error}</p>
        </div>
      )}

      {/* EMPTY */}

      {!loading &&
        groupedHistory.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            No history records found
          </div>
        )}

      {/* ======================================================
          TABLE
          ====================================================== */}

      {!loading &&
        groupedHistory.length > 0 && (
          <div className="w-full overflow-x-auto">
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
                {paginatedGroups.map(
                  (group) => {
                    const firstRecord =
                      group.records[0];

                    return group.records.map(
                      (
                        record,
                        recordIndex
                      ) => (
                        <TableRow
                          key={
                            record.id
                          }
                        >
                          {/* DATE */}

                          <TableCell>
                            {new Date(
                              record.created_at
                            ).toLocaleDateString(
                              "id-ID"
                            )}
                          </TableCell>

                          {/* TIME */}

                          <TableCell>
                            {new Date(
                              record.created_at
                            ).toLocaleTimeString(
                              "id-ID"
                            )}
                          </TableCell>

                          {/* TRANSACTION NUMBER
                              hanya tampil sekali
                          */}

                          {recordIndex ===
                            0 && (
                            <TableCell
                              rowSpan={
                                group
                                  .records
                                  .length
                              }
                              className="font-semibold align-top bg-muted/20"
                            >
                              {
                                group.transaction_number
                              }
                            </TableCell>
                          )}

                          {/* INVOICE
                              hanya tampil sekali
                          */}

                          {recordIndex ===
                            0 && (
                            <TableCell
                              rowSpan={
                                group
                                  .records
                                  .length
                              }
                              className="font-semibold align-top bg-muted/20"
                            >
                              {group.invoice_number ===
                              "-" ? (
                                <span className="text-muted-foreground">
                                  -
                                </span>
                              ) : (
                                group.invoice_number
                              )}
                            </TableCell>
                          )}

                          {/* TYPE */}

                          {recordIndex ===
                            0 && (
                            <TableCell
                              rowSpan={
                                group
                                  .records
                                  .length
                              }
                              className="align-top"
                            >
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  firstRecord.transaction_type ===
                                  "BARANG_MASUK"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {firstRecord.transaction_type ===
                                "BARANG_MASUK"
                                  ? "BARANG MASUK"
                                  : "PENJUALAN"}
                              </span>
                            </TableCell>
                          )}

                          {/* PRODUCT */}

                          <TableCell>
                            {record.product_name ||
                              "-"}
                          </TableCell>

                          {/* CODE */}

                          <TableCell>
                            {record.product_code ||
                              "-"}
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

                          {/* TOTAL PRICE */}

                          <TableCell className="text-right">
                            Rp{" "}
                            {Number(
                              record.total_price ||
                                0
                            ).toLocaleString(
                              "id-ID"
                            )}
                          </TableCell>

                          {/* PAYMENT */}

                          {recordIndex ===
                            0 && (
                            <TableCell
                              rowSpan={
                                group
                                  .records
                                  .length
                              }
                              className="align-top"
                            >
                              {firstRecord.payment_method ||
                                "-"}
                            </TableCell>
                          )}

                          {/* STATUS */}

                          {recordIndex ===
                            0 && (
                            <TableCell
                              rowSpan={
                                group
                                  .records
                                  .length
                              }
                              className="align-top"
                            >
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  firstRecord.status ===
                                  "Barang Diterima"
                                    ? "bg-green-100 text-green-800"
                                    : firstRecord.status ===
                                      "Tidak Diterima"
                                    ? "bg-red-100 text-red-800"
                                    : firstRecord.status ===
                                      "Prepared"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : firstRecord.status ===
                                      "Sent"
                                    ? "bg-blue-100 text-blue-800"
                                    : firstRecord.status ===
                                      "Received"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {firstRecord.status ||
                                  "-"}
                              </span>
                            </TableCell>
                          )}

                          {/* ACTION */}

                          <TableCell className="text-center">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleDeleteHistory(
                                  record.id
                                )
                              }
                              className="px-3"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    );
                  }
                )}
              </TableBody>
            </Table>
          </div>
        )}

      {/* PAGINATION */}

      {!loading &&
        groupedHistory.length > 0 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    setPage((p) =>
                      Math.max(
                        p - 1,
                        1
                      )
                    )
                  }
                />
              </PaginationItem>

              {Array.from({
                length: totalPages,
              }).map((_, i) => (
                <PaginationItem
                  key={i}
                >
                  <PaginationLink
                    isActive={
                      i + 1 === page
                    }
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
