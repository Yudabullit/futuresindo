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
import { Trash2, Edit3, Plus, Download } from "lucide-react";
import { XlsxTable } from "@/components/ui/xlsx-table";

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

const BarangMasuk = () => {
  const [transactions, setTransactions] = useState<BarangMasukItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { toast } = useToast();

  const [formData, setFormData] = useState({
    transaction_number: "BM-",
    supplier_name: "",
    invoice_number: "",
    product_id: "",
    product_name: "",
    product_code: "",
    qty: 0,
    price: 0,
    total_price: 0,
    status: "Menunggu Konfirmasi",
    notes: "",
  });

  // ============================================
  // FETCH BARANG MASUK
  // ============================================

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("barang_masuk")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(
          `transaction_number.ilike.%${searchTerm}%,supplier_name.ilike.%${searchTerm}%,product_name.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      setTransactions(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [searchTerm]);

  // ============================================
  // FETCH PRODUCTS
  // ============================================

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

  // ============================================
  // PRODUCT CHANGE
  // ============================================

  const handleProductChange = (productId: string) => {
    const p = products.find((prod) => prod.id === productId);

    if (p) {
      setFormData((prev) => ({
        ...prev,
        product_id: productId,
        product_name: p.description,
        product_code: p.code,
        price: p.price || 0,
        total_price: prev.qty * (p.price || 0),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        product_id: productId,
      }));
    }
  };

  // ============================================
  // QTY CHANGE
  // ============================================

  const handleQtyChange = (qty: number) => {
    setFormData((prev) => ({
      ...prev,
      qty,
      total_price: qty * prev.price,
    }));
  };

  // ============================================
  // PRICE CHANGE
  // ============================================

  const handlePriceChange = (price: number) => {
    setFormData((prev) => ({
      ...prev,
      price,
      total_price: prev.qty * price,
    }));
  };

  // ============================================
  // ADD TRANSACTION
  // ============================================

  const handleAddTransaction = () => {
    setDialogMode("add");
    setEditingId(null);

    setFormData({
      transaction_number: "BM-",
      supplier_name: "",
      invoice_number: "",
      product_id: "",
      product_name: "",
      product_code: "",
      qty: 0,
      price: 0,
      total_price: 0,
      status: "Menunggu Konfirmasi",
      notes: "",
    });

    setDialogOpen(true);
  };

  // ============================================
  // EDIT TRANSACTION
  // ============================================

  const handleEditTransaction = (
    transaction: BarangMasukItem
  ) => {
    setDialogMode("edit");

    setFormData({
      transaction_number:
        transaction.transaction_number,
      supplier_name:
        transaction.supplier_name || "",
      invoice_number:
        transaction.invoice_number || "",
      product_id:
        transaction.product_id || "",
      product_name:
        transaction.product_name || "",
      product_code:
        transaction.product_code || "",
      qty: transaction.qty,
      price: transaction.price,
      total_price: transaction.total_price,
      status: transaction.status,
      notes: transaction.notes || "",
    });

    setEditingId(transaction.id);
    setDialogOpen(true);
  };

  // ============================================
  // DELETE TRANSACTION
  // ============================================

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
      // Ambil transaksi terlebih dahulu
      const {
        data: transaction,
        error: fetchError,
      } = await supabase
        .from("barang_masuk")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Hapus transaksi
      const { error: deleteError } =
        await supabase
          .from("barang_masuk")
          .delete()
          .eq("id", id);

      if (deleteError) throw deleteError;

      // ============================================
      // KEMBALIKAN STOK PRODUCT
      // ============================================

      if (transaction?.product_id) {
        const {
          data: product,
          error: productError,
        } = await supabase
          .from("products")
          .select("qty")
          .eq("id", transaction.product_id)
          .single();

        if (productError) throw productError;

        const currentQty = Number(product?.qty || 0);
        const transactionQty = Number(
          transaction.qty || 0
        );

        const newQty = Math.max(
          0,
          currentQty - transactionQty
        );

        const { error: updateError } =
          await supabase
            .from("products")
            .update({
              qty: newQty,
            })
            .eq("id", transaction.product_id);

        if (updateError) throw updateError;
      }

      await fetchTransactions();

      toast({
        title: "Success",
        description:
          "Transaction deleted and stock restored successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description:
          err.message ||
          "Failed to delete transaction",
        variant: "destructive",
      });
    }
  };

  // ============================================
  // SUBMIT TRANSACTION
  // ============================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {
      if (
        !formData.transaction_number ||
        formData.transaction_number === "BM-"
      ) {
        toast({
          title: "Error",
          description:
            "Please enter the transaction number after BM-",
          variant: "destructive",
        });

        return;
      }

      if (!formData.product_id) {
        toast({
          title: "Error",
          description:
            "Please select a product",
          variant: "destructive",
        });

        return;
      }

      if (formData.qty <= 0) {
        toast({
          title: "Error",
          description:
            "Quantity must be greater than 0",
          variant: "destructive",
        });

        return;
      }

      // ============================================
      // ADD
      // ============================================

      if (dialogMode === "add") {
        const payload = {
          ...formData,
          total_price:
            formData.qty * formData.price,
        };

        // Insert transaction
        const {
          data: insertedTransaction,
          error: insertError,
        } = await supabase
          .from("barang_masuk")
          .insert(payload)
          .select()
          .single();

        if (insertError) throw insertError;

        // ============================================
        // TAMBAH STOK PRODUCT SATU KALI
        // ============================================

        const {
          data: product,
          error: productError,
        } = await supabase
          .from("products")
          .select("qty")
          .eq("id", formData.product_id)
          .single();

        if (productError) throw productError;

        const currentQty = Number(
          product?.qty || 0
        );

        const incomingQty = Number(
          formData.qty || 0
        );

        const newQty =
          currentQty + incomingQty;

        const { error: stockError } =
          await supabase
            .from("products")
            .update({
              qty: newQty,
            })
            .eq("id", formData.product_id);

        if (stockError) throw stockError;

        toast({
          title: "Success",
          description:
            `Transaction added. Stock increased by ${incomingQty}.`,
        });
      }

      // ============================================
      // EDIT
      // ============================================

      else if (editingId) {
        // Ambil data transaksi lama
        const {
          data: oldTransaction,
          error: oldError,
        } = await supabase
          .from("barang_masuk")
          .select("*")
          .eq("id", editingId)
          .single();

        if (oldError) throw oldError;

        const oldQty = Number(
          oldTransaction?.qty || 0
        );

        const oldProductId =
          oldTransaction?.product_id;

        const newQty = Number(
          formData.qty || 0
        );

        const newProductId =
          formData.product_id;

        // ============================================
        // UPDATE TRANSACTION
        // ============================================

        const payload = {
          ...formData,
          total_price:
            formData.qty * formData.price,
        };

        const { error: updateError } =
          await supabase
            .from("barang_masuk")
            .update(payload)
            .eq("id", editingId);

        if (updateError) throw updateError;

        // ============================================
        // JIKA PRODUCT SAMA
        // ============================================

        if (
          oldProductId &&
          oldProductId === newProductId
        ) {
          const difference =
            newQty - oldQty;

          if (difference !== 0) {
            const {
              data: product,
              error: productError,
            } = await supabase
              .from("products")
              .select("qty")
              .eq("id", newProductId)
              .single();

            if (productError)
              throw productError;

            const currentQty = Number(
              product?.qty || 0
            );

            const updatedQty =
              currentQty + difference;

            const { error: stockError } =
              await supabase
                .from("products")
                .update({
                  qty: Math.max(
                    0,
                    updatedQty
                  ),
                })
                .eq("id", newProductId);

            if (stockError)
              throw stockError;
          }
        }

        // ============================================
        // JIKA PRODUCT DIGANTI
        // ============================================

        else {
          // Kurangi stok product lama
          if (oldProductId) {
            const {
              data: oldProduct,
              error: oldProductError,
            } = await supabase
              .from("products")
              .select("qty")
              .eq("id", oldProductId)
              .single();

            if (oldProductError)
              throw oldProductError;

            const oldCurrentQty =
              Number(
                oldProduct?.qty || 0
              );

            const restoredQty =
              Math.max(
                0,
                oldCurrentQty - oldQty
              );

            const {
              error: restoreError,
            } = await supabase
              .from("products")
              .update({
                qty: restoredQty,
              })
              .eq("id", oldProductId);

            if (restoreError)
              throw restoreError;
          }

          // Tambahkan stok product baru
          if (newProductId) {
            const {
              data: newProduct,
              error: newProductError,
            } = await supabase
              .from("products")
              .select("qty")
              .eq("id", newProductId)
              .single();

            if (newProductError)
              throw newProductError;

            const newCurrentQty =
              Number(
                newProduct?.qty || 0
              );

            const finalQty =
              newCurrentQty + newQty;

            const {
              error: newStockError,
            } = await supabase
              .from("products")
              .update({
                qty: finalQty,
              })
              .eq("id", newProductId);

            if (newStockError)
              throw newStockError;
          }
        }

        toast({
          title: "Success",
          description:
            "Transaction and stock updated successfully",
        });
      }

      setDialogOpen(false);
      setEditingId(null);

      await fetchTransactions();

      // Refresh products supaya stock terbaru terlihat
      const {
        data: refreshedProducts,
      } = await supabase
        .from("products")
        .select("*");

      setProducts(
        refreshedProducts || []
      );
    } catch (err: any) {
      toast({
        title: "Error",
        description:
          err.message ||
          "Failed to save transaction",
        variant: "destructive",
      });
    }
  };

  // ============================================
  // FORMAT DATE
  // ============================================

  const formatDate = (
    date: string | null | undefined
  ) => {
    if (!date) return "-";

    return new Date(
      date
    ).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // ============================================
  // PAGINATION
  // ============================================

  const rowsPerPage = 10;

  const totalPages =
    Math.ceil(
      transactions.length /
        rowsPerPage
    ) || 1;

  const paginatedTransactions =
    transactions.slice(
      (page - 1) * rowsPerPage,
      page * rowsPerPage
    );

  // ============================================
  // RETURN
  // ============================================

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-2xl font-bold">
            Barang Masuk
          </h1>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">

          <Button
            onClick={handleAddTransaction}
            className="flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Barang Masuk
          </Button>

          <XlsxTable
            data={transactions}
            columns={[
              {
                header: "Tanggal",
                key: "created_at",
              },
              {
                header:
                  "Nomor Transaksi",
                key: "transaction_number",
              },
              {
                header: "Supplier",
                key: "supplier_name",
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
                header: "Total Price",
                key: "total_price",
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
              className="px-3"
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
          placeholder="Search transaction..."
          className="w-full"
        />
      </div>

      {/* ERROR */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p>{error}</p>
        </div>
      )}

      {/* EMPTY */}
      {!loading &&
        transactions.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            No transactions found
          </div>
        )}

      {/* TABLE */}
      {!loading &&
        transactions.length > 0 && (
          <Table>

            <TableHeader>
              <TableRow>

                <TableCell className="font-semibold">
                  Tanggal
                </TableCell>

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
                  Product Name
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
                  Status
                </TableCell>

                <TableCell className="text-center font-semibold">
                  Actions
                </TableCell>

              </TableRow>
            </TableHeader>

            <TableBody>

              {paginatedTransactions.map(
                (t) => (
                  <TableRow key={t.id}>

                    <TableCell>
                      {formatDate(
                        t.created_at
                      )}
                    </TableCell>

                    <TableCell className="font-medium">
                      {
                        t.transaction_number
                      }
                    </TableCell>

                    <TableCell>
                      {t.supplier_name ||
                        "-"}
                    </TableCell>

                    <TableCell>
                      {t.invoice_number ||
                        "-"}
                    </TableCell>

                    <TableCell>
                      {t.product_name ||
                        "-"}
                    </TableCell>

                    <TableCell>
                      {t.product_code ||
                        "-"}
                    </TableCell>

                    <TableCell className="text-right">
                      {t.qty?.toLocaleString() ||
                        "0"}
                    </TableCell>

                    <TableCell className="text-right">
                      Rp{" "}
                      {Number(
                        t.total_price ||
                          0
                      ).toLocaleString()}
                    </TableCell>

                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          t.status ===
                          "Barang Diterima"
                            ? "bg-green-100 text-green-800"
                            : t.status ===
                              "Tidak Diterima"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {t.status}
                      </span>
                    </TableCell>

                    <TableCell className="flex justify-center space-x-2">

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleEditTransaction(
                            t
                          )
                        }
                        className="px-3"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          handleDeleteTransaction(
                            t.id
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
        )}

      {/* PAGINATION */}
      {!loading &&
        transactions.length > 0 && (
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

      {/* DIALOG */}
      <Dialog
        open={dialogOpen}
        onOpenChange={
          setDialogOpen
        }
      >

        <DialogContent className="w-full max-w-lg">

          <DialogHeader>

            <DialogTitle>
              {dialogMode === "add"
                ? "Add Barang Masuk"
                : "Edit Barang Masuk"}
            </DialogTitle>

            <DialogDescription>
              Fill in transaction details below
            </DialogDescription>

          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >

            {/* TRANSACTION + INVOICE */}
            <div className="grid grid-cols-2 gap-4">

              <div>

                <label className="block text-sm font-medium mb-1">
                  Transaction No *
                </label>

                <Input
                  value={
                    formData.transaction_number
                  }
                  onChange={(e) => {
                    let value =
                      e.target.value;

                    if (
                      !value.startsWith(
                        "BM-"
                      )
                    ) {
                      value =
                        "BM-" +
                        value.replace(
                          /^BM-/i,
                          ""
                        );
                    }

                    setFormData({
                      ...formData,
                      transaction_number:
                        value,
                    });
                  }}
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

            {/* SUPPLIER */}
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

            {/* PRODUCT */}
            <div>

              <label className="block text-sm font-medium mb-1">
                Select Product
              </label>

              <Select
                value={
                  formData.product_id
                }
                onValueChange={
                  handleProductChange
                }
              >

                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a product" />
                </SelectTrigger>

                <SelectContent>

                  {products.map((p) => (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                    >
                      {p.code} -{" "}
                      {p.description}{" "}
                      (Stock:{" "}
                      {p.qty ?? 0})
                    </SelectItem>
                  ))}

                </SelectContent>

              </Select>

            </div>

            {/* QTY PRICE TOTAL */}
            <div className="grid grid-cols-3 gap-4">

              <div>

                <label className="block text-sm font-medium mb-1">
                  Qty *
                </label>

                <Input
                  type="number"
                  min="0"
                  value={
                    formData.qty
                  }
                  onChange={(e) =>
                    handleQtyChange(
                      Number(
                        e.target.value
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
                    formData.price
                  }
                  onChange={(e) =>
                    handlePriceChange(
                      Number(
                        e.target.value
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
                    formData.total_price
                  }
                  disabled
                  className="bg-gray-100"
                />

              </div>

            </div>

            {/* STATUS */}
            <div>

              <label className="block text-sm font-medium mb-1">
                Status
              </label>

              <Select
                value={
                  formData.status
                }
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    status: val,
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

            {/* BUTTON */}
            <div className="flex justify-end space-x-3 pt-4">

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
                {dialogMode === "add"
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
