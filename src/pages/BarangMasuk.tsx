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

/* =========================================================
   TYPES
========================================================= */

interface BarangMasukItem {
  id: string;

  transaction_number: string;

  supplier_name?: string;

  invoice_number?: string;

  product_id?: string;

  product_name?: string;

  product_code?: string;

  qty: number;

  price: number;

  total_price: number;

  status: string;

  notes?: string;

  created_at?: string;
}

interface OrderItem {
  product_id: string;

  product_name: string;

  product_code: string;

  qty: number;

  price: number;

  total_price: number;
}

interface GroupedTransaction {
  id: string;

  transaction_number: string;

  supplier_name?: string;

  invoice_number?: string;

  status: string;

  notes?: string;

  created_at?: string;

  products: OrderItem[];

  total_qty: number;

  total_price: number;
}

/* =========================================================
   COMPONENT
========================================================= */

const BarangMasuk = () => {
  const { toast } = useToast();

  /* =======================================================
     STATE
  ======================================================= */

  const [transactions, setTransactions] = useState<
    BarangMasukItem[]
  >([]);

  const [products, setProducts] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);

  const [dialogMode, setDialogMode] =
    useState<"add" | "edit">("add");

  const [editingTransactionNumber, setEditingTransactionNumber] =
    useState<string | null>(null);

  const [page, setPage] = useState(1);

  const rowsPerPage = 10;

  /* =======================================================
     FORM
  ======================================================= */

  const [formData, setFormData] = useState({
    transaction_number: "",
    supplier_name: "",
    invoice_number: "",
    status: "Menunggu Konfirmasi",
    notes: "",
  });

  /* =======================================================
     ORDER ITEMS
  ======================================================= */

  const emptyOrderItem = (): OrderItem => ({
    product_id: "",
    product_name: "",
    product_code: "",
    qty: 0,
    price: 0,
    total_price: 0,
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    emptyOrderItem(),
  ]);

  /* =======================================================
     FETCH BARANG MASUK
  ======================================================= */

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("barang_masuk")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (searchTerm.trim()) {
        query = query.or(
          `transaction_number.ilike.%${searchTerm}%,supplier_name.ilike.%${searchTerm}%,invoice_number.ilike.%${searchTerm}%,product_name.ilike.%${searchTerm}%,product_code.ilike.%${searchTerm}%`
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

      setError(
        err?.message ||
          "Failed to load barang masuk"
      );

      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     FETCH PRODUCTS
  ======================================================= */

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
    fetchTransactions();
  }, [searchTerm]);

  useEffect(() => {
    fetchProducts();
  }, []);

  /* =======================================================
     UPDATE PRODUCT STOCK
     
     INI BAGIAN PENTING.
     
     Setiap item diproses SATU PER SATU.
     
     A 3 PCS -> A + 3
     B 4 PCS -> B + 4
  ======================================================= */

  const updateProductStock = async (
    productId: string,
    quantityChange: number
  ) => {
    if (!productId) {
      throw new Error(
        "Product ID tidak ditemukan."
      );
    }

    if (!quantityChange) {
      return;
    }

    /* Ambil stok terbaru */

    const { data: product, error: fetchError } =
      await supabase
        .from("products")
        .select("id, qty, description")
        .eq("id", productId)
        .single();

    if (fetchError) {
      throw fetchError;
    }

    if (!product) {
      throw new Error(
        `Product ${productId} tidak ditemukan.`
      );
    }

    const currentQty = Number(
      product.qty || 0
    );

    const newQty =
      currentQty + Number(quantityChange);

    /* Jangan sampai stok negatif */

    if (newQty < 0) {
      throw new Error(
        `Stok ${product.description || "produk"} tidak mencukupi. Stok saat ini: ${currentQty}.`
      );
    }

    const { error: updateError } =
      await supabase
        .from("products")
        .update({
          qty: newQty,
        })
        .eq("id", productId);

    if (updateError) {
      throw updateError;
    }
  };

  /* =======================================================
     INCREASE STOCK FOR ALL ITEMS
     
     Dipanggil ketika:
     Menunggu Konfirmasi -> Barang Diterima
  ======================================================= */

  const increaseStockForItems = async (
    items: BarangMasukItem[]
  ) => {
    for (const item of items) {
      await updateProductStock(
        item.product_id || "",
        Number(item.qty || 0)
      );
    }
  };

  /* =======================================================
     DECREASE STOCK FOR ALL ITEMS
     
     Dipanggil ketika:
     Barang Diterima -> Menunggu Konfirmasi
     
     atau ketika transaksi received dihapus.
  ======================================================= */

  const decreaseStockForItems = async (
    items: BarangMasukItem[]
  ) => {
    for (const item of items) {
      await updateProductStock(
        item.product_id || "",
        -Number(item.qty || 0)
      );
    }
  };

  /* =======================================================
     PRODUCT CHANGE
  ======================================================= */

  const handleProductChange = (
    index: number,
    productId: string
  ) => {
    const product = products.find(
      (p) => p.id === productId
    );

    setOrderItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) {
          return item;
        }

        if (!product) {
          return {
            ...item,
            product_id: productId,
          };
        }

        const price = Number(
          product.price || 0
        );

        return {
          ...item,

          product_id: product.id,

          product_name:
            product.description || "",

          product_code:
            product.code || "",

          price,

          total_price:
            Number(item.qty || 0) * price,
        };
      })
    );
  };

  /* =======================================================
     QTY CHANGE
  ======================================================= */

  const handleQtyChange = (
    index: number,
    qty: number
  ) => {
    setOrderItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,

              qty,

              total_price:
                qty *
                Number(
                  item.price || 0
                ),
            }
          : item
      )
    );
  };

  /* =======================================================
     PRICE CHANGE
  ======================================================= */

  const handlePriceChange = (
    index: number,
    price: number
  ) => {
    setOrderItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,

              price,

              total_price:
                Number(item.qty || 0) *
                price,
            }
          : item
      )
    );
  };

  /* =======================================================
     ADD PRODUCT ROW
  ======================================================= */

  const handleAddProductRow = () => {
    setOrderItems((prev) => [
      ...prev,
      emptyOrderItem(),
    ]);
  };

  /* =======================================================
     REMOVE PRODUCT ROW
  ======================================================= */

  const handleRemoveProductRow = (
    index: number
  ) => {
    if (orderItems.length <= 1) {
      return;
    }

    setOrderItems((prev) =>
      prev.filter(
        (_, i) => i !== index
      )
    );
  };

  /* =======================================================
     TOTAL ORDER
  ======================================================= */

  const orderTotal =
    orderItems.reduce(
      (total, item) =>
        total +
        Number(
          item.total_price || 0
        ),
      0
    );

  /* =======================================================
     ADD TRANSACTION
  ======================================================= */

  const handleAddTransaction = () => {
    setDialogMode("add");

    setEditingTransactionNumber(null);

    setFormData({
      transaction_number: `BM-${Date.now()
        .toString()
        .slice(-6)}`,

      supplier_name: "",

      invoice_number: "",

      status:
        "Menunggu Konfirmasi",

      notes: "",
    });

    setOrderItems([
      emptyOrderItem(),
    ]);

    setDialogOpen(true);
  };

  /* =======================================================
     EDIT TRANSACTION
     
     PENTING:
     Ambil SEMUA barang dengan transaction_number sama.
     
     Jadi kalau:
     
     BM-123
     A = 3
     B = 4
     
     keduanya akan masuk ke form edit.
  ======================================================= */

  const handleEditTransaction = async (
    transaction: GroupedTransaction
  ) => {
    try {
      setLoading(true);

      const {
        data,
        error,
      } = await supabase
        .from("barang_masuk")
        .select("*")
        .eq(
          "transaction_number",
          transaction.transaction_number
        )
        .order("created_at", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error(
          "Transaction tidak ditemukan."
        );
      }

      const first = data[0];

      setDialogMode("edit");

      setEditingTransactionNumber(
        transaction.transaction_number
      );

      setFormData({
        transaction_number:
          first.transaction_number || "",

        supplier_name:
          first.supplier_name || "",

        invoice_number:
          first.invoice_number || "",

        status:
          first.status ||
          "Menunggu Konfirmasi",

        notes:
          first.notes || "",
      });

      setOrderItems(
        data.map((item: BarangMasukItem) => ({
          product_id:
            item.product_id || "",

          product_name:
            item.product_name || "",

          product_code:
            item.product_code || "",

          qty: Number(
            item.qty || 0
          ),

          price: Number(
            item.price || 0
          ),

          total_price: Number(
            item.total_price || 0
          ),
        }))
      );

      setDialogOpen(true);
    } catch (err: any) {
      toast({
        title: "Error",

        description:
          err?.message ||
          "Failed to load transaction.",

        variant:
          "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     DELETE TRANSACTION
     
     Kalau Received:
       stok dikurangi semua item.
     
     Kalau Pending:
       tidak ada perubahan stok.
  ======================================================= */

  const handleDeleteTransaction = async (
    transactionNumber: string
  ) => {
    if (
      !window.confirm(
        "Delete this entire transaction?"
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      /* Ambil semua item */

      const {
        data: items,
        error: fetchError,
      } = await supabase
        .from("barang_masuk")
        .select("*")
        .eq(
          "transaction_number",
          transactionNumber
        );

      if (fetchError) {
        throw fetchError;
      }

      const transactionItems =
        (items ||
          []) as BarangMasukItem[];

      if (
        transactionItems.length === 0
      ) {
        throw new Error(
          "Transaction tidak ditemukan."
        );
      }

      /* Kalau Received,
         kembalikan stok */

      const isReceived =
        transactionItems[0]
          .status ===
        "Barang Diterima";

      if (isReceived) {
        await decreaseStockForItems(
          transactionItems
        );
      }

      /* Hapus SEMUA row */

      const {
        error: deleteError,
      } = await supabase
        .from("barang_masuk")
        .delete()
        .eq(
          "transaction_number",
          transactionNumber
        );

      if (deleteError) {
        throw deleteError;
      }

      await fetchTransactions();

      await fetchProducts();

      toast({
        title: "Success",

        description:
          "Transaction deleted successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Error",

        description:
          err?.message ||
          "Failed to delete transaction.",

        variant:
          "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {
      setLoading(true);

      /* =================================================
         VALIDASI
      ================================================= */

      if (
        orderItems.length === 0
      ) {
        throw new Error(
          "Please add at least one product."
        );
      }

      const invalidProduct =
        orderItems.some(
          (item) =>
            !item.product_id ||
            !item.product_name
        );

      if (invalidProduct) {
        throw new Error(
          "Please select a product for every row."
        );
      }

      const invalidQty =
        orderItems.some(
          (item) =>
            !item.qty ||
            Number(item.qty) <= 0
        );

      if (invalidQty) {
        throw new Error(
          "Quantity must be greater than 0."
        );
      }

      /* =================================================
         EDIT TRANSACTION
         
         Kita update SEMUA item.
         
         Pertama ambil kondisi lama.
      ================================================= */

      if (
        dialogMode === "edit" &&
        editingTransactionNumber
      ) {
        const {
          data: oldItemsData,
          error: oldItemsError,
        } = await supabase
          .from("barang_masuk")
          .select("*")
          .eq(
            "transaction_number",
            editingTransactionNumber
          );

        if (oldItemsError) {
          throw oldItemsError;
        }

        const oldItems =
          (oldItemsData ||
            []) as BarangMasukItem[];

        if (
          oldItems.length === 0
        ) {
          throw new Error(
            "Old transaction tidak ditemukan."
          );
        }

        const oldStatus =
          oldItems[0].status;

        const newStatus =
          formData.status;

        /* =================================================
           KASUS 1

           OLD RECEIVED
           NEW PENDING

           Kurangi stok semua barang.
        ================================================= */

        if (
          oldStatus ===
            "Barang Diterima" &&
          newStatus !==
            "Barang Diterima"
        ) {
          await decreaseStockForItems(
            oldItems
          );
        }

        /* =================================================
           KASUS 2

           OLD PENDING
           NEW RECEIVED

           Tambahkan stok semua barang BARU.
        ================================================= */

        if (
          oldStatus !==
            "Barang Diterima" &&
          newStatus ===
            "Barang Diterima"
        ) {
          for (const item of orderItems) {
            await updateProductStock(
              item.product_id,
              Number(item.qty)
            );
          }
        }

        /* =================================================
           KASUS 3

           OLD RECEIVED
           NEW RECEIVED

           Stok harus disesuaikan berdasarkan
           perbedaan item lama dan item baru.

           Contoh:

           Lama:
           A 3
           B 4

           Baru:
           A 5
           B 2

           Maka:

           A +2
           B -2
        ================================================= */

        if (
          oldStatus ===
            "Barang Diterima" &&
          newStatus ===
            "Barang Diterima"
        ) {
          const oldMap =
            new Map<
              string,
              number
            >();

          const newMap =
            new Map<
              string,
              number
            >();

          /* OLD */

          for (const item of oldItems) {
            const id =
              item.product_id || "";

            const qty =
              Number(
                item.qty || 0
              );

            oldMap.set(
              id,
              (oldMap.get(id) ||
                0) + qty
            );
          }

          /* NEW */

          for (const item of orderItems) {
            const id =
              item.product_id;

            const qty =
              Number(
                item.qty || 0
              );

            newMap.set(
              id,
              (newMap.get(id) ||
                0) + qty
            );
          }

          /* Semua product ID */

          const productIds =
            new Set([
              ...oldMap.keys(),
              ...newMap.keys(),
            ]);

          for (const productId of productIds) {
            const oldQty =
              oldMap.get(
                productId
              ) || 0;

            const newQty =
              newMap.get(
                productId
              ) || 0;

            const difference =
              newQty - oldQty;

            if (
              difference !== 0
            ) {
              await updateProductStock(
                productId,
                difference
              );
            }
          }
        }

        /* =================================================
           HAPUS ROW LAMA
        ================================================= */

        const {
          error: deleteOldError,
        } = await supabase
          .from("barang_masuk")
          .delete()
          .eq(
            "transaction_number",
            editingTransactionNumber
          );

        if (deleteOldError) {
          throw deleteOldError;
        }

        /* =================================================
           INSERT ROW BARU
           
           Semua item disimpan.
        ================================================= */

        const payloads =
          orderItems.map(
            (item) => ({
              transaction_number:
                formData.transaction_number,

              supplier_name:
                formData.supplier_name,

              invoice_number:
                formData.invoice_number,

              product_id:
                item.product_id,

              product_name:
                item.product_name,

              product_code:
                item.product_code,

              qty:
                Number(
                  item.qty
                ),

              price:
                Number(
                  item.price
                ),

              total_price:
                Number(
                  item.total_price
                ),

              status:
                formData.status,

              notes:
                formData.notes,
            })
          );

        const {
          error: insertError,
        } = await supabase
          .from("barang_masuk")
          .insert(payloads);

        if (insertError) {
          throw insertError;
        }

        toast({
          title: "Success",

          description:
            "Transaction updated successfully.",
        });
      }

      /* =================================================
         ADD TRANSACTION
      ================================================= */

      else {
        const payloads =
          orderItems.map(
            (item) => ({
              transaction_number:
                formData.transaction_number,

              supplier_name:
                formData.supplier_name,

              invoice_number:
                formData.invoice_number,

              product_id:
                item.product_id,

              product_name:
                item.product_name,

              product_code:
                item.product_code,

              qty:
                Number(
                  item.qty
                ),

              price:
                Number(
                  item.price
                ),

              total_price:
                Number(
                  item.total_price
                ),

              status:
                formData.status,

              notes:
                formData.notes,
            })
          );

        /* INSERT SEMUA BARANG */

        const {
          data: insertedItems,
          error: insertError,
        } = await supabase
          .from("barang_masuk")
          .insert(payloads)
          .select("*");

        if (insertError) {
          throw insertError;
        }

        /* =================================================
           JIKA LANGSUNG RECEIVED
           
           UPDATE SEMUA PRODUCT.
           
           A 3
           B 4

           A +3
           B +4
        ================================================= */

        if (
          formData.status ===
          "Barang Diterima"
        ) {
          for (const item of
            orderItems) {
            await updateProductStock(
              item.product_id,
              Number(item.qty)
            );
          }
        }

        toast({
          title: "Success",

          description:
            `${orderItems.length} product${
              orderItems.length >
              1
                ? "s"
                : ""
            } added successfully.`,
        });
      }

      /* =================================================
         REFRESH
      ================================================= */

      setDialogOpen(false);

      setEditingTransactionNumber(
        null
      );

      await fetchTransactions();

      await fetchProducts();
    } catch (err: any) {
      console.error(err);

      toast({
        title: "Error",

        description:
          err?.message ||
          "Failed to save transaction.",

        variant:
          "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     GROUP TRANSACTIONS
     
     Transaction number sama = 1 order.
     
     A + B tetap ditampilkan dalam SATU row transaksi.
  ======================================================= */

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
            id:
              transaction.id,

            transaction_number:
              transaction.transaction_number,

            supplier_name:
              transaction.supplier_name,

            invoice_number:
              transaction.invoice_number,

            status:
              transaction.status,

            notes:
              transaction.notes,

            created_at:
              transaction.created_at,

            products: [],

            total_qty: 0,

            total_price: 0,
          };
        }

        groups[key].products.push({
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
            transaction.price || 0
          ),

          total_price:
            Number(
              transaction.total_price ||
                0
            ),
        });

        groups[key].total_qty +=
          Number(
            transaction.qty || 0
          );

        groups[key].total_price +=
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

  /* =======================================================
     PAGINATION
  ======================================================= */

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

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="space-y-6">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Barang Masuk
          </h1>

          <p className="text-muted-foreground">
            Manage incoming goods
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={
              handleAddTransaction
            }
          >
            <Plus className="mr-2 h-4 w-4" />

            Add Barang Masuk
          </Button>

          <XlsxTable
            data={transactions}
            columns={[
              {
                header:
                  "Nomor Transaksi",
                key:
                  "transaction_number",
              },

              {
                header: "Supplier",
                key:
                  "supplier_name",
              },

              {
                header: "Invoice",
                key:
                  "invoice_number",
              },

              {
                header: "Product",
                key:
                  "product_name",
              },

              {
                header: "Code",
                key:
                  "product_code",
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
                key:
                  "total_price",
              },

              {
                header: "Status",
                key: "status",
              },
            ]}
            filename="barang_masuk.xlsx"
            className="flex items-center"
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

      {/* =================================================
          SEARCH
      ================================================= */}

      <div className="w-full max-w-sm">
        <Search
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(
              e.target.value
            )
          }
          placeholder="Search transaction..."
          className="w-full"
        />
      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p>{error}</p>
        </div>
      )}

      {/* =================================================
          LOADING
      ================================================= */}

      {loading && (
        <div className="text-center py-10 text-gray-500">
          Loading...
        </div>
      )}

      {/* =================================================
          EMPTY
      ================================================= */}

      {!loading &&
        groupedTransactionList.length ===
          0 && (
          <div className="text-center py-10 text-gray-500">
            No transactions found
          </div>
        )}

      {/* =================================================
          TABLE
      ================================================= */}

      {!loading &&
        groupedTransactionList.length >
          0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell className="font-semibold">
                    Transaction No
                  </TableCell>

                  <TableCell className="font-semibold">
                    Supplier
                  </TableCell>

                  <TableCell className="font-semibold">
                    Invoice No
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
                    Status
                  </TableCell>

                  <TableCell className="text-center font-semibold">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedTransactions.map(
                  (transaction) => (
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

                      {/* SUPPLIER */}

                      <TableCell className="align-top">
                        {transaction.supplier_name ||
                          "-"}
                      </TableCell>

                      {/* INVOICE */}

                      <TableCell className="align-top">
                        {transaction.invoice_number ||
                          "-"}
                      </TableCell>

                      {/* PRODUCT */}

                      <TableCell className="align-top">
                        <div className="space-y-2">
                          {transaction.products.map(
                            (
                              product,
                              index
                            ) => (
                              <div
                                key={
                                  `${product.product_id}-${index}`
                                }
                                className="min-h-[24px]"
                              >
                                {
                                  product.product_name
                                }
                              </div>
                            )
                          )}

                          {transaction.products
                            .length >
                            1 && (
                            <div className="border-t pt-2 font-bold">
                              Total
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* CODE */}

                      <TableCell className="align-top">
                        <div className="space-y-2">
                          {transaction.products.map(
                            (
                              product,
                              index
                            ) => (
                              <div
                                key={
                                  `${product.product_id}-code-${index}`
                                }
                                className="min-h-[24px]"
                              >
                                {
                                  product.product_code
                                }
                              </div>
                            )
                          )}
                        </div>
                      </TableCell>

                      {/* QTY */}

                      <TableCell className="text-right align-top">
                        <div className="space-y-2">
                          {transaction.products.map(
                            (
                              product,
                              index
                            ) => (
                              <div
                                key={
                                  `${product.product_id}-qty-${index}`
                                }
                                className="min-h-[24px]"
                              >
                                {product.qty.toLocaleString(
                                  "id-ID"
                                )}
                              </div>
                            )
                          )}

                          {transaction.products
                            .length >
                            1 && (
                            <div className="border-t pt-2 font-bold">
                              {transaction.total_qty.toLocaleString(
                                "id-ID"
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* PRICE */}

                      <TableCell className="text-right align-top">
                        <div className="space-y-2">
                          {transaction.products.map(
                            (
                              product,
                              index
                            ) => (
                              <div
                                key={
                                  `${product.product_id}-price-${index}`
                                }
                                className="min-h-[24px]"
                              >
                                Rp{" "}
                                {product.price.toLocaleString(
                                  "id-ID"
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </TableCell>

                      {/* TOTAL */}

                      <TableCell className="text-right align-top">
                        <div className="space-y-2">
                          {transaction.products.map(
                            (
                              product,
                              index
                            ) => (
                              <div
                                key={
                                  `${product.product_id}-total-${index}`
                                }
                                className="min-h-[24px]"
                              >
                                Rp{" "}
                                {product.total_price.toLocaleString(
                                  "id-ID"
                                )}
                              </div>
                            )
                          )}

                          {transaction.products
                            .length >
                            1 && (
                            <div className="border-t pt-2 font-bold">
                              Rp{" "}
                              {transaction.total_price.toLocaleString(
                                "id-ID"
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* STATUS */}

                      <TableCell className="align-top">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.status ===
                            "Barang Diterima"
                              ? "bg-green-100 text-green-800"
                              : transaction.status ===
                                "Tidak Diterima"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
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
                                transaction
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
                                transaction.transaction_number
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

      {/* =================================================
          PAGINATION
      ================================================= */}

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
                length:
                  totalPages,
              }).map(
                (_, i) => (
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
                )
              )}

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

      {/* =================================================
          DIALOG
      ================================================= */}

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
                ? "Add Barang Masuk"
                : "Edit Barang Masuk"}
            </DialogTitle>

            <DialogDescription>
              {dialogMode ===
              "add"
                ? "Add one or more products to this order."
                : "Edit all products in this transaction."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={
              handleSubmit
            }
            className="space-y-5"
          >
            {/* =================================================
                TRANSACTION + INVOICE
            ================================================= */}

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
                  Invoice No
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
            </div>

            {/* =================================================
                SUPPLIER
            ================================================= */}

            <div>
              <label className="block text-sm font-medium mb-1">
                Supplier Name
              </label>

              <Input
                value={
                  formData.supplier_name
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,

                    supplier_name:
                      e.target.value,
                  })
                }
                placeholder="Supplier name"
              />
            </div>

            {/* =================================================
                PRODUCTS
            ================================================= */}

            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    Products
                  </h3>

                  <p className="text-sm text-muted-foreground">
                    Add multiple products
                    to this order.
                  </p>
                </div>

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
                    {/* PRODUCT HEADER */}

                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">
                        Product{" "}
                        {index + 1}
                      </div>

                      {orderItems.length >
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
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4 mr-1" />

                          Remove
                        </Button>
                      )}
                    </div>

                    {/* SELECT PRODUCT */}

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
                            (p) => (
                              <SelectItem
                                key={
                                  p.id
                                }
                                value={
                                  p.id
                                }
                              >
                                {p.code}{" "}
                                -{" "}
                                {
                                  p.description
                                }

                                {p.qty !==
                                  undefined &&
                                  ` (Stock: ${Number(
                                    p.qty
                                  ).toLocaleString(
                                    "id-ID"
                                  )})`}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* QTY PRICE TOTAL */}

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
                              ) ||
                                0
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
                              ) ||
                                0
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

              {/* TOTAL ORDER */}

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

            {/* =================================================
                STATUS
            ================================================= */}

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

                    status:
                      value,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="Menunggu Konfirmasi">
                    Menunggu Konfirmasi
                  </SelectItem>

                  <SelectItem value="Barang Diterima">
                    Barang Diterima
                  </SelectItem>

                  <SelectItem value="Tidak Diterima">
                    Tidak Diterima
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* =================================================
                BUTTON
            ================================================= */}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setDialogOpen(
                    false
                  )
                }
                disabled={loading}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Saving..."
                  : dialogMode ===
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

export default BarangMasuk;
