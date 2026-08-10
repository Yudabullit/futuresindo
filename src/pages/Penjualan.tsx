import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  Edit3,
  Plus,
  Download,
  X,
} from "lucide-react";

import { XlsxTable } from "@/components/ui/xlsx-table";

interface Product {
  id: string;
  code?: string;
  description?: string;
  price?: number;
  qty?: number;
}

interface OrderItem {
  product_id: string;
  product_name: string;
  product_code: string;
  qty: number;
  price: number;
  total_price: number;
}

interface Transaction {
  id: string;
  transaction_number: string;
  customer_name?: string;
  invoice_number?: string;
  product_id?: string;
  product_name?: string;
  product_code?: string;
  qty?: number;
  price?: number;
  total_price?: number;
  payment_method?: string;
  status?: string;
  notes?: string;
  created_at?: string;
}

interface GroupedTransaction extends Transaction {
  products: Transaction[];
  total_qty: number;
  total_price: number;
}

const Penjualan = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] =
    useState<"add" | "edit">("add");

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [page, setPage] = useState(1);

  const { toast } = useToast();

  const [formData, setFormData] = useState({
    transaction_number: "",
    customer_name: "",
    invoice_number: "",
    payment_method: "Cash",
    status: "Prepared",
    notes: "",
  });

  const [orderItems, setOrderItems] =
    useState<OrderItem[]>([
      {
        product_id: "",
        product_name: "",
        product_code: "",
        qty: 0,
        price: 0,
        total_price: 0,
      },
    ]);

  // =========================================================
  // FETCH PENJUALAN
  // =========================================================

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("penjualan")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (searchTerm) {
        query = query.or(
          `transaction_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,product_name.ilike.%${searchTerm}%,invoice_number.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setTransactions(data || []);
      setError(null);
      setPage(1);
    } catch (err: any) {
      console.error(err);

      setError(err.message);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [searchTerm]);

  // =========================================================
  // FETCH PRODUCTS
  // =========================================================

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("description", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      setProducts(data || []);
    } catch (err: any) {
      console.error(
        "Failed to fetch products:",
        err
      );
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // =========================================================
  // UPDATE STOCK
  //
  // change:
  // -3 = kurangi stok 3
  // +3 = tambah stok 3
  // =========================================================

  const updateProductStock = async (
    productId: string,
    change: number
  ) => {
    if (!productId) {
      throw new Error(
        "Product ID tidak ditemukan."
      );
    }

    const { data: product, error } =
      await supabase
        .from("products")
        .select("id, qty, description, code")
        .eq("id", productId)
        .single();

    if (error) {
      throw error;
    }

    const currentStock = Number(
      product?.qty || 0
    );

    const newStock =
      currentStock + Number(change);

    // Tidak boleh stok negatif
    if (newStock < 0) {
      throw new Error(
        `Stok ${product?.description || product?.code || "produk"} tidak mencukupi. Stok saat ini: ${currentStock}, diperlukan: ${Math.abs(change)}.`
      );
    }

    const { error: updateError } =
      await supabase
        .from("products")
        .update({
          qty: newStock,
        })
        .eq("id", productId);

    if (updateError) {
      throw updateError;
    }
  };

  // =========================================================
  // APPLY STOCK FOR MULTIPLE PRODUCTS
  //
  // Contoh:
  //
  // Barang A 3
  // Barang B 4
  //
  // akan menjalankan:
  //
  // A => -3
  // B => -4
  // =========================================================

  const decreaseStockForOrder = async (
    items: OrderItem[]
  ) => {
    for (const item of items) {
      await updateProductStock(
        item.product_id,
        -Number(item.qty)
      );
    }
  };

  // =========================================================
  // RESTORE STOCK FOR MULTIPLE PRODUCTS
  // =========================================================

  const restoreStockForOrder = async (
    items: OrderItem[]
  ) => {
    for (const item of items) {
      await updateProductStock(
        item.product_id,
        Number(item.qty)
      );
    }
  };

  // =========================================================
  // GET ORDER ITEMS FROM DATABASE
  // =========================================================

  const getOrderItemsByTransaction =
    async (
      transactionNumber: string
    ): Promise<OrderItem[]> => {
      const { data, error } =
        await supabase
          .from("penjualan")
          .select(
            "product_id, product_name, product_code, qty, price, total_price"
          )
          .eq(
            "transaction_number",
            transactionNumber
          );

      if (error) {
        throw error;
      }

      return (data || []).map(
        (item: any) => ({
          product_id:
            item.product_id || "",
          product_name:
            item.product_name || "",
          product_code:
            item.product_code || "",
          qty: Number(item.qty || 0),
          price: Number(item.price || 0),
          total_price:
            Number(item.total_price || 0),
        })
      );
    };

  // =========================================================
  // ADD PRODUCT ROW
  // =========================================================

  const handleAddProductRow = () => {
    setOrderItems((prev) => [
      ...prev,
      {
        product_id: "",
        product_name: "",
        product_code: "",
        qty: 0,
        price: 0,
        total_price: 0,
      },
    ]);
  };

  // =========================================================
  // REMOVE PRODUCT ROW
  // =========================================================

  const handleRemoveProductRow = (
    index: number
  ) => {
    if (orderItems.length === 1) {
      return;
    }

    setOrderItems((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  // =========================================================
  // PRODUCT CHANGE
  // =========================================================

  const handleProductChange = (
    index: number,
    productId: string
  ) => {
    const product = products.find(
      (p) => p.id === productId
    );

    if (!product) {
      return;
    }

    const price = Number(
      product.price || 0
    );

    setOrderItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) {
          return item;
        }

        return {
          ...item,
          product_id: productId,
          product_name:
            product.description || "",
          product_code:
            product.code || "",
          price,
          total_price:
            Number(item.qty || 0) *
            price,
        };
      })
    );
  };

  // =========================================================
  // QTY CHANGE
  // =========================================================

  const handleQtyChange = (
    index: number,
    qty: number
  ) => {
    setOrderItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) {
          return item;
        }

        return {
          ...item,
          qty,
          total_price:
            qty *
            Number(item.price || 0),
        };
      })
    );
  };

  // =========================================================
  // PRICE CHANGE
  // =========================================================

  const handlePriceChange = (
    index: number,
    price: number
  ) => {
    setOrderItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) {
          return item;
        }

        return {
          ...item,
          price,
          total_price:
            Number(item.qty || 0) *
            price,
        };
      })
    );
  };

  // =========================================================
  // TOTAL
  // =========================================================

  const orderTotal =
    orderItems.reduce(
      (sum, item) =>
        sum +
        Number(
          item.total_price || 0
        ),
      0
    );

  // =========================================================
  // ADD TRANSACTION
  // =========================================================

  const handleAddTransaction = () => {
    setDialogMode("add");
    setEditingId(null);

    setFormData({
      transaction_number: `PJ-${Date.now()
        .toString()
        .slice(-6)}`,
      customer_name: "",
      invoice_number: "",
      payment_method: "Cash",
      status: "Prepared",
      notes: "",
    });

    setOrderItems([
      {
        product_id: "",
        product_name: "",
        product_code: "",
        qty: 0,
        price: 0,
        total_price: 0,
      },
    ]);

    setDialogOpen(true);
  };

  // =========================================================
  // EDIT TRANSACTION
  // =========================================================

  const handleEditTransaction = async (
    transaction: Transaction
  ) => {
    try {
      setDialogMode("edit");

      setFormData({
        transaction_number:
          transaction.transaction_number,
        customer_name:
          transaction.customer_name ||
          "",
        invoice_number:
          transaction.invoice_number ||
          "",
        payment_method:
          transaction.payment_method ||
          "Cash",
        status:
          transaction.status ||
          "Prepared",
        notes:
          transaction.notes || "",
      });

      /*
       * Ambil semua item dari transaction
       */
      const items =
        await getOrderItemsByTransaction(
          transaction.transaction_number
        );

      /*
       * Untuk edit kita tampilkan semua
       * product dalam order.
       */
      setOrderItems(
        items.length > 0
          ? items
          : [
              {
                product_id:
                  transaction.product_id ||
                  "",
                product_name:
                  transaction.product_name ||
                  "",
                product_code:
                  transaction.product_code ||
                  "",
                qty: Number(
                  transaction.qty || 0
                ),
                price: Number(
                  transaction.price ||
                    0
                ),
                total_price:
                  Number(
                    transaction.total_price ||
                      0
                  ),
              },
            ]
      );

      setEditingId(transaction.id);
      setDialogOpen(true);
    } catch (err: any) {
      toast({
        title: "Error",
        description:
          err.message ||
          "Failed to load transaction.",
        variant: "destructive",
      });
    }
  };

  // =========================================================
  // DELETE
  // =========================================================

  const handleDeleteTransaction = async (
    id: string
  ) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this transaction?"
      )
    ) {
      return;
    }

    try {
      /*
       * Ambil transaksi yang akan dihapus
       */
      const { data: transaction, error } =
        await supabase
          .from("penjualan")
          .select("*")
          .eq("id", id)
          .single();

      if (error) {
        throw error;
      }

      /*
       * Jika Received, stok harus
       * dikembalikan.
       */
      if (
        transaction.status ===
        "Received"
      ) {
        await updateProductStock(
          transaction.product_id,
          Number(transaction.qty || 0)
        );
      }

      /*
       * Hapus row penjualan
       */
      const { error: deleteError } =
        await supabase
          .from("penjualan")
          .delete()
          .eq("id", id);

      if (deleteError) {
        throw deleteError;
      }

      await fetchTransactions();
      await fetchProducts();

      toast({
        title: "Success",
        description:
          "Transaction deleted and stock restored.",
      });
    } catch (err: any) {
      console.error(err);

      toast({
        title: "Error",
        description:
          err.message ||
          "Failed to delete transaction.",
        variant: "destructive",
      });
    }
  };

  // =========================================================
  // SUBMIT
  // =========================================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {
      // -----------------------------------------------------
      // VALIDASI
      // -----------------------------------------------------

      if (
        !orderItems ||
        orderItems.length === 0
      ) {
        toast({
          title: "Error",
          description:
            "Please add at least one product.",
          variant: "destructive",
        });

        return;
      }

      const invalidProduct =
        orderItems.some(
          (item) =>
            !item.product_id ||
            !item.product_name
        );

      if (invalidProduct) {
        toast({
          title: "Error",
          description:
            "Please select a product for every row.",
          variant: "destructive",
        });

        return;
      }

      const invalidQty =
        orderItems.some(
          (item) =>
            Number(item.qty || 0) <= 0
        );

      if (invalidQty) {
        toast({
          title: "Error",
          description:
            "Quantity must be greater than 0.",
          variant: "destructive",
        });

        return;
      }

      // -----------------------------------------------------
      // CEK PRODUCT DUPLICATE
      // -----------------------------------------------------

      const productIds =
        orderItems.map(
          (item) => item.product_id
        );

      const duplicateProduct =
        productIds.some(
          (id, index) =>
            productIds.indexOf(id) !==
            index
        );

      if (duplicateProduct) {
        toast({
          title: "Error",
          description:
            "Produk yang sama tidak boleh dipilih dua kali dalam satu transaksi.",
          variant: "destructive",
        });

        return;
      }

      // =====================================================
      // ADD
      // =====================================================

      if (
        dialogMode === "add"
      ) {
        /*
         * Jika Received, cek semua stok
         * TERLEBIH DAHULU.
         */
        if (
          formData.status ===
          "Received"
        ) {
          for (const item of orderItems) {
            const product =
              products.find(
                (p) =>
                  p.id ===
                  item.product_id
              );

            const stock = Number(
              product?.qty || 0
            );

            if (
              stock <
              Number(item.qty)
            ) {
              throw new Error(
                `Stok ${item.product_name} tidak cukup. Stok: ${stock}, penjualan: ${item.qty}.`
              );
            }
          }
        }

        /*
         * INSERT SEMUA ITEM
         */
        const payloads =
          orderItems.map(
            (item) => ({
              transaction_number:
                formData.transaction_number,

              customer_name:
                formData.customer_name,

              invoice_number:
                formData.invoice_number,

              product_id:
                item.product_id,

              product_name:
                item.product_name,

              product_code:
                item.product_code,

              qty: Number(
                item.qty
              ),

              price: Number(
                item.price
              ),

              total_price:
                Number(
                  item.total_price
                ),

              payment_method:
                formData.payment_method,

              status:
                formData.status,

              notes:
                formData.notes,
            })
          );

        const { error } =
          await supabase
            .from("penjualan")
            .insert(
              payloads
            );

        if (error) {
          throw error;
        }

        /*
         * ==================================================
         * INI BAGIAN PALING PENTING
         *
         * SEMUA ITEM DIKURANGI
         * ==================================================
         */
        if (
          formData.status ===
          "Received"
        ) {
          await decreaseStockForOrder(
            orderItems
          );
        }

        toast({
          title: "Success",
          description:
            `${orderItems.length} product berhasil ditambahkan.`,
        });
      }

      // =====================================================
      // EDIT
      // =====================================================

      else if (
        dialogMode ===
          "edit" &&
        editingId
      ) {
        /*
         * Ambil row lama
         */
        const {
          data: oldTransaction,
          error: oldError,
        } = await supabase
          .from("penjualan")
          .select("*")
          .eq("id", editingId)
          .single();

        if (oldError) {
          throw oldError;
        }

        const oldStatus =
          oldTransaction.status;

        /*
         * Jika transaksi lama Received,
         * kembalikan stok lama terlebih
         * dahulu.
         */
        if (
          oldStatus ===
          "Received"
        ) {
          await updateProductStock(
            oldTransaction.product_id,
            Number(
              oldTransaction.qty ||
                0
            )
          );
        }

        /*
         * Jika status baru Received,
         * cek stok baru.
         */
        if (
          formData.status ===
          "Received"
        ) {
          for (const item of orderItems) {
            const product =
              products.find(
                (p) =>
                  p.id ===
                  item.product_id
              );

            const stock =
              Number(
                product?.qty || 0
              );

            if (
              stock <
              Number(item.qty)
            ) {
              throw new Error(
                `Stok ${item.product_name} tidak cukup. Stok: ${stock}, penjualan: ${item.qty}.`
              );
            }
          }
        }

        /*
         * Karena edit bisa berisi
         * beberapa produk, row lama
         * harus diperbarui dan row
         * lainnya disesuaikan.
         */

        /*
         * Ambil semua row transaksi lama
         */
        const {
          data: oldRows,
          error: oldRowsError,
        } = await supabase
          .from("penjualan")
          .select("*")
          .eq(
            "transaction_number",
            oldTransaction.transaction_number
          )
          .order("created_at", {
            ascending: true,
          });

        if (oldRowsError) {
          throw oldRowsError;
        }

        /*
         * Jika transaksi lama Received,
         * semua stok lama harus dikembalikan.
         *
         * Row pertama sudah dikembalikan
         * di atas, jadi row lainnya
         * dikembalikan di sini.
         */
        if (
          oldStatus ===
          "Received"
        ) {
          for (
            let i = 1;
            i < (oldRows || []).length;
            i++
          ) {
            const oldRow =
              oldRows?.[i];

            if (
              oldRow?.product_id
            ) {
              await updateProductStock(
                oldRow.product_id,
                Number(
                  oldRow.qty || 0
                )
              );
            }
          }
        }

        /*
         * ==================================================
         * UPDATE ROW PERTAMA
         * ==================================================
         */

        const firstItem =
          orderItems[0];

        const firstPayload = {
          transaction_number:
            formData.transaction_number,

          customer_name:
            formData.customer_name,

          invoice_number:
            formData.invoice_number,

          product_id:
            firstItem.product_id,

          product_name:
            firstItem.product_name,

          product_code:
            firstItem.product_code,

          qty: Number(
            firstItem.qty
          ),

          price: Number(
            firstItem.price
          ),

          total_price:
            Number(
              firstItem.total_price
            ),

          payment_method:
            formData.payment_method,

          status:
            formData.status,

          notes:
            formData.notes,
        };

        const {
          error: updateError,
        } = await supabase
          .from("penjualan")
          .update(
            firstPayload
          )
          .eq(
            "id",
            editingId
          );

        if (updateError) {
          throw updateError;
        }

        /*
         * ==================================================
         * HAPUS ROW PRODUK LAMA LAINNYA
         * ==================================================
         */

        if (
          oldRows &&
          oldRows.length > 1
        ) {
          const oldIds =
            oldRows
              .slice(1)
              .map(
                (row) =>
                  row.id
              );

          const {
            error:
              deleteOldError,
          } = await supabase
            .from(
              "penjualan"
            )
            .delete()
            .in(
              "id",
              oldIds
            );

          if (deleteOldError) {
            throw deleteOldError;
          }
        }

        /*
         * ==================================================
         * INSERT PRODUK LAINNYA
         * ==================================================
         */

        if (
          orderItems.length >
          1
        ) {
          const additionalItems =
            orderItems
              .slice(1)
              .map(
                (item) => ({
                  transaction_number:
                    formData.transaction_number,

                  customer_name:
                    formData.customer_name,

                  invoice_number:
                    formData.invoice_number,

                  product_id:
                    item.product_id,

                  product_name:
                    item.product_name,

                  product_code:
                    item.product_code,

                  qty: Number(
                    item.qty
                  ),

                  price: Number(
                    item.price
                  ),

                  total_price:
                    Number(
                      item.total_price
                    ),

                  payment_method:
                    formData.payment_method,

                  status:
                    formData.status,

                  notes:
                    formData.notes,
                })
              );

          const {
            error:
              insertAdditionalError,
          } = await supabase
            .from(
              "penjualan"
            )
            .insert(
              additionalItems
            );

          if (
            insertAdditionalError
          ) {
            throw insertAdditionalError;
          }
        }

        /*
         * ==================================================
         * KURANGI STOK BARU
         *
         * SEMUA PRODUK
         * ==================================================
         */

        if (
          formData.status ===
          "Received"
        ) {
          await decreaseStockForOrder(
            orderItems
          );
        }

        toast({
          title: "Success",
          description:
            "Transaction updated and inventory synchronized.",
        });
      }

      setDialogOpen(false);

      await fetchTransactions();
      await fetchProducts();
    } catch (err: any) {
      console.error(
        "SUBMIT ERROR:",
        err
      );

      toast({
        title: "Error",
        description:
          err.message ||
          "Failed to save transaction.",
        variant:
          "destructive",
      });

      /*
       * Refresh supaya data
       * frontend mengikuti database.
       */
      await fetchTransactions();
      await fetchProducts();
    }
  };

  // =========================================================
  // GROUP TRANSACTIONS
  // =========================================================

  const groupedTransactions =
    transactions.reduce(
      (
        groups: Record<
          string,
          GroupedTransaction
        >,
        transaction
      ) => {
        const key =
          transaction.transaction_number;

        if (!groups[key]) {
          groups[key] = {
            ...transaction,
            products: [],
            total_qty: 0,
            total_price: 0,
          };
        }

        groups[
          key
        ].products.push(
          transaction
        );

        groups[
          key
        ].total_qty += Number(
          transaction.qty || 0
        );

        groups[
          key
        ].total_price +=
          Number(
            transaction.total_price ||
              0
          );

        return groups;
      },
      {}
    );

  const groupedTransactionList =
    Object.values(
      groupedTransactions
    );

  // =========================================================
  // PAGINATION
  // =========================================================

  const rowsPerPage = 10;

  const totalPages =
    Math.ceil(
      groupedTransactionList.length /
        rowsPerPage
    ) || 1;

  const paginatedTransactions =
    groupedTransactionList.slice(
      (page - 1) *
        rowsPerPage,
      page * rowsPerPage
    );

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Penjualan
          </h1>

          <p className="text-muted-foreground">
            Manage sales transactions
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">
          <Button
            onClick={
              handleAddTransaction
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Penjualan
          </Button>

          <XlsxTable
            data={transactions}
            columns={[
              {
                header:
                  "Nomor Transaksi",
                key: "transaction_number",
              },
              {
                header: "Customer",
                key: "customer_name",
              },
              {
                header: "Invoice",
                key: "invoice_number",
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
                header:
                  "Total Price",
                key: "total_price",
              },
              {
                header:
                  "Payment Method",
                key: "payment_method",
              },
              {
                header: "Status",
                key: "status",
              },
            ]}
            filename="penjualan.xlsx"
          >
            <Button
              variant="outline"
              size="sm"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </XlsxTable>
        </div>
      </div>

      {/* SEARCH */}

      <div className="w-full max-w-sm">
        <Search
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(
              e.target.value
            )
          }
          placeholder="Search sales..."
        />
      </div>

      {/* ERROR */}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
          {error}
        </div>
      )}

      {/* EMPTY */}

      {!loading &&
        groupedTransactionList.length ===
          0 && (
          <div className="text-center py-10 text-gray-500">
            No transactions found
          </div>
        )}

      {/* TABLE */}

      {!loading &&
        groupedTransactionList.length >
          0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>
                    Transaction No
                  </TableCell>

                  <TableCell>
                    Customer
                  </TableCell>

                  <TableCell>
                    Invoice
                  </TableCell>

                  <TableCell>
                    Product Name
                  </TableCell>

                  <TableCell>
                    Code
                  </TableCell>

                  <TableCell className="text-right">
                    Qty
                  </TableCell>

                  <TableCell className="text-right">
                    Total Price
                  </TableCell>

                  <TableCell>
                    Payment
                  </TableCell>

                  <TableCell>
                    Status
                  </TableCell>

                  <TableCell className="text-center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedTransactions.map(
                  (
                    transaction
                  ) => (
                    <TableRow
                      key={
                        transaction.transaction_number
                      }
                    >
                      {/* TRANSACTION */}

                      <TableCell className="font-medium align-top">
                        {
                          transaction.transaction_number
                        }
                      </TableCell>

                      {/* CUSTOMER */}

                      <TableCell className="align-top">
                        {transaction.customer_name ||
                          "-"}
                      </TableCell>

                      {/* INVOICE */}

                      <TableCell className="align-top">
                        {transaction.invoice_number ||
                          "-"}
                      </TableCell>

                      {/* PRODUCTS */}

                      <TableCell className="align-top">
                        <div className="space-y-1">
                          {transaction.products.map(
                            (
                              product,
                              index
                            ) => (
                              <div
                                key={
                                  product.id ||
                                  index
                                }
                                className="min-h-[24px]"
                              >
                                {product.product_name ||
                                  "-"}
                              </div>
                            )
                          )}
                        </div>
                      </TableCell>

                      {/* CODE */}

                      <TableCell className="align-top">
                        <div className="space-y-1">
                          {transaction.products.map(
                            (
                              product,
                              index
                            ) => (
                              <div
                                key={
                                  product.id ||
                                  index
                                }
                                className="min-h-[24px]"
                              >
                                {product.product_code ||
                                  "-"}
                              </div>
                            )
                          )}
                        </div>
                      </TableCell>

                      {/* QTY */}

                      <TableCell className="text-right align-top">
                        <div className="space-y-1">
                          {transaction.products.map(
                            (
                              product,
                              index
                            ) => (
                              <div
                                key={
                                  product.id ||
                                  index
                                }
                                className="min-h-[24px]"
                              >
                                {Number(
                                  product.qty ||
                                    0
                                ).toLocaleString(
                                  "id-ID"
                                )}
                              </div>
                            )
                          )}

                          {transaction
                            .products
                            .length >
                            1 && (
                            <div className="border-t mt-2 pt-1 font-bold">
                              {transaction.total_qty.toLocaleString(
                                "id-ID"
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* TOTAL */}

                      <TableCell className="text-right align-top">
                        <div className="space-y-1">
                          {transaction.products.map(
                            (
                              product,
                              index
                            ) => (
                              <div
                                key={
                                  product.id ||
                                  index
                                }
                                className="min-h-[24px]"
                              >
                                Rp{" "}
                                {Number(
                                  product.total_price ||
                                    0
                                ).toLocaleString(
                                  "id-ID"
                                )}
                              </div>
                            )
                          )}

                          {transaction
                            .products
                            .length >
                            1 && (
                            <div className="border-t mt-2 pt-1 font-bold">
                              Rp{" "}
                              {transaction.total_price.toLocaleString(
                                "id-ID"
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* PAYMENT */}

                      <TableCell className="align-top">
                        <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                          {
                            transaction.payment_method
                          }
                        </span>
                      </TableCell>

                      {/* STATUS */}

                      <TableCell className="align-top">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.status ===
                            "Received"
                              ? "bg-green-100 text-green-800"
                              : transaction.status ===
                                "Sent"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {
                            transaction.status
                          }
                        </span>
                      </TableCell>

                      {/* ACTION */}

                      <TableCell className="align-top">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleEditTransaction(
                                transaction.products[0]
                              )
                            }
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              handleDeleteTransaction(
                                transaction
                                  .products[0]
                                  ?.id
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
        )}

      {/* PAGINATION */}

      {!loading &&
        groupedTransactionList.length >
          0 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    setPage(
                      (p) =>
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
                      i + 1 ===
                      page
                    }
                    onClick={() =>
                      setPage(
                        i + 1
                      )
                    }
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setPage(
                      (p) =>
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

      {/* =====================================================
          DIALOG
      ===================================================== */}

      <Dialog
        open={dialogOpen}
        onOpenChange={
          setDialogOpen
        }
      >
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode ===
              "add"
                ? "Add Sales Transaction"
                : "Edit Sales Transaction"}
            </DialogTitle>

            <DialogDescription>
              {dialogMode ===
              "add"
                ? "Add one or more products to this order"
                : "Edit transaction details below"}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={
              handleSubmit
            }
            className="space-y-5"
          >
            {/* TRANSACTION */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Transaction No *
                </label>

                <Input
                  value={
                    formData.transaction_number
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      transaction_number:
                        e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Customer Name
                </label>

                <Input
                  value={
                    formData.customer_name
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      customer_name:
                        e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* INVOICE */}

            <div>
              <label className="block text-sm font-medium mb-1">
                Invoice
              </label>

              <Input
                value={
                  formData.invoice_number
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    invoice_number:
                      e.target.value,
                  })
                }
                placeholder="Invoice number"
              />
            </div>

            {/* PRODUCTS */}

            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    Products
                  </h3>

                  <p className="text-sm text-muted-foreground">
                    Multiple products in one transaction
                  </p>
                </div>

                {dialogMode ===
                  "add" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={
                      handleAddProductRow
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                )}
              </div>

              {orderItems.map(
                (
                  item,
                  index
                ) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">
                        Product{" "}
                        {index + 1}
                      </span>

                      {dialogMode ===
                        "add" &&
                        orderItems.length >
                          1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleRemoveProductRow(
                                index
                              )
                            }
                            className="text-red-500"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        )}
                    </div>

                    {/* PRODUCT */}

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Select Product *
                      </label>

                      <Select
                        value={
                          item.product_id
                        }
                        onValueChange={(
                          value
                        ) =>
                          handleProductChange(
                            index,
                            value
                          )
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose a product" />
                        </SelectTrigger>

                        <SelectContent>
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
                                {product.code}{" "}
                                -{" "}
                                {
                                  product.description
                                }{" "}
                                (Stock:{" "}
                                {Number(
                                  product.qty ||
                                    0
                                ).toLocaleString(
                                  "id-ID"
                                )}
                                )
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* QTY / PRICE */}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Qty *
                        </label>

                        <Input
                          type="number"
                          min="1"
                          value={
                            item.qty
                          }
                          onChange={(
                            e
                          ) =>
                            handleQtyChange(
                              index,
                              Number(
                                e.target
                                  .value
                              ) || 0
                            )
                          }
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Price *
                        </label>

                        <Input
                          type="number"
                          min="0"
                          value={
                            item.price
                          }
                          onChange={(
                            e
                          ) =>
                            handlePriceChange(
                              index,
                              Number(
                                e.target
                                  .value
                              ) || 0
                            )
                          }
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Total Price
                        </label>

                        <Input
                          type="number"
                          value={
                            item.total_price
                          }
                          disabled
                          className="bg-gray-100"
                        />
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* TOTAL */}

              <div className="border-t pt-4 flex justify-end">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    Total Order
                  </div>

                  <div className="text-xl font-bold">
                    Rp{" "}
                    {orderTotal.toLocaleString(
                      "id-ID"
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* PAYMENT + STATUS */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Payment Method
                </label>

                <Select
                  value={
                    formData.payment_method
                  }
                  onValueChange={(
                    value
                  ) =>
                    setFormData({
                      ...formData,
                      payment_method:
                        value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="Cash">
                      Cash
                    </SelectItem>

                    <SelectItem value="Transfer">
                      Transfer
                    </SelectItem>

                    <SelectItem value="Credit">
                      Credit
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Status
                </label>

                <Select
                  value={
                    formData.status
                  }
                  onValueChange={(
                    value
                  ) =>
                    setFormData({
                      ...formData,
                      status: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
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
              </div>
            </div>

            {/* BUTTON */}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setDialogOpen(
                    false
                  )
                }
              >
                Cancel
              </Button>

              <Button type="submit">
                {dialogMode ===
                "add"
                  ? "Add Transaction"
                  : "Update Transaction"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Penjualan;
