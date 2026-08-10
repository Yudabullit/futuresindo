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

const Penjualan = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [products, setProducts] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { toast } = useToast();

  const [formData, setFormData] = useState({
    transaction_number: "INV-",
    customer_name: "",
    invoice_number: "",
    product_id: "",
    product_name: "",
    product_code: "",
    qty: 0,
    price: 0,
    total_price: 0,
    payment_method: "Cash",
    status: "Prepared",
    notes: "",
  });

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("penjualan")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(
          `transaction_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,product_name.ilike.%${searchTerm}%`
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

  const handleProductChange = (productId: string) => {
    const product = products.find((p) => p.id === productId);

    if (product) {
      setFormData((prev) => ({
        ...prev,
        product_id: productId,
        product_name: product.description,
        product_code: product.code,
        price: product.price || 0,
        total_price: prev.qty * (product.price || 0),
      }));
    }
  };

  const handleQtyChange = (qty: number) => {
    setFormData((prev) => ({
      ...prev,
      qty,
      total_price: qty * prev.price,
    }));
  };

  const handleAddTransaction = () => {
    setDialogMode("add");
    setEditingId(null);

    setFormData({
      transaction_number: "INV-",
      customer_name: "",
      invoice_number: "",
      product_id: "",
      product_name: "",
      product_code: "",
      qty: 0,
      price: 0,
      total_price: 0,
      payment_method: "Cash",
      status: "Prepared",
      notes: "",
    });

    setDialogOpen(true);
  };

  const handleEditTransaction = (transaction: any) => {
    setDialogMode("edit");

    setFormData({
      transaction_number: transaction.transaction_number || "INV-",
      customer_name: transaction.customer_name || "",
      invoice_number: transaction.invoice_number || "",
      product_id: transaction.product_id || "",
      product_name: transaction.product_name || "",
      product_code: transaction.product_code || "",
      qty: transaction.qty || 0,
      price: transaction.price || 0,
      total_price: transaction.total_price || 0,
      payment_method: transaction.payment_method || "Cash",
      status: transaction.status || "Prepared",
      notes: transaction.notes || "",
    });

    setEditingId(transaction.id);
    setDialogOpen(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this transaction?"
      )
    )
      return;

    try {
      const { data: transaction, error: fetchError } = await supabase
        .from("penjualan")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("penjualan")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Kembalikan stok ketika transaksi penjualan dihapus
      if (transaction?.product_id && transaction?.qty) {
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("qty")
          .eq("id", transaction.product_id)
          .single();

        if (!productError && product) {
          const currentStock = Number(product.qty || 0);
          const returnedStock =
            currentStock + Number(transaction.qty || 0);

          await supabase
            .from("products")
            .update({
              qty: returnedStock,
            })
            .eq("id", transaction.product_id);
        }
      }

      await fetchTransactions();

      const { data: refreshedProducts } = await supabase
        .from("products")
        .select("*");

      setProducts(refreshedProducts || []);

      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description:
          err.message || "Failed to delete transaction",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Pastikan nomor transaksi selalu diawali INV-
      let transactionNumber = formData.transaction_number.trim();

      if (!transactionNumber.startsWith("INV-")) {
        transactionNumber = `INV-${transactionNumber}`;
      }

      if (transactionNumber === "INV-") {
        toast({
          title: "Error",
          description:
            "Silakan masukkan nomor transaksi setelah INV-",
          variant: "destructive",
        });
        return;
      }

      const totalPrice = formData.qty * formData.price;

      const payload = {
        ...formData,
        transaction_number: transactionNumber,
        total_price: totalPrice,
      };

      if (dialogMode === "add") {
        // Cek produk
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("qty")
          .eq("id", formData.product_id)
          .single();

        if (productError) throw productError;

        if (!product) {
          throw new Error("Product not found");
        }

        const currentStock = Number(product.qty || 0);
        const requestedQty = Number(formData.qty || 0);

        if (requestedQty <= 0) {
          toast({
            title: "Error",
            description: "Qty harus lebih dari 0",
            variant: "destructive",
          });
          return;
        }

        if (currentStock < requestedQty) {
          toast({
            title: "Stock Tidak Cukup",
            description: `Stock tersedia hanya ${currentStock}`,
            variant: "destructive",
          });
          return;
        }

        // Insert transaksi
        const { error } = await supabase
          .from("penjualan")
          .insert(payload);

        if (error) throw error;

        // Kurangi stok produk
        const newStock = currentStock - requestedQty;

        const { error: stockError } = await supabase
          .from("products")
          .update({
            qty: newStock,
          })
          .eq("id", formData.product_id);

        if (stockError) throw stockError;

        toast({
          title: "Success",
          description:
            "Transaction added and product stock updated successfully",
        });
      } else if (editingId) {
        // Ambil transaksi lama
        const { data: oldTransaction, error: oldTransactionError } =
          await supabase
            .from("penjualan")
            .select("*")
            .eq("id", editingId)
            .single();

        if (oldTransactionError) throw oldTransactionError;

        // Update transaksi
        const { error } = await supabase
          .from("penjualan")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;

        // Jika produk atau qty berubah,
        // kembalikan stok transaksi lama terlebih dahulu
        if (oldTransaction) {
          const oldProductId = oldTransaction.product_id;
          const oldQty = Number(oldTransaction.qty || 0);
          const newProductId = formData.product_id;
          const newQty = Number(formData.qty || 0);

          // Produk sama
          if (oldProductId === newProductId) {
            const { data: product, error: productError } = await supabase
              .from("products")
              .select("qty")
              .eq("id", newProductId)
              .single();

            if (productError) throw productError;

            if (product) {
              const currentStock = Number(product.qty || 0);

              // Kembalikan qty lama, kemudian kurangi qty baru
              const stockAfterReturn =
                currentStock + oldQty;

              if (stockAfterReturn < newQty) {
                throw new Error(
                  `Stock tidak cukup. Stock tersedia ${stockAfterReturn}`
                );
              }

              const finalStock =
                stockAfterReturn - newQty;

              const { error: stockError } = await supabase
                .from("products")
                .update({
                  qty: finalStock,
                })
                .eq("id", newProductId);

              if (stockError) throw stockError;
            }
          } else {
            // Jika produk berbeda:
            // kembalikan stok produk lama
            if (oldProductId && oldQty > 0) {
              const { data: oldProduct, error: oldProductError } =
                await supabase
                  .from("products")
                  .select("qty")
                  .eq("id", oldProductId)
                  .single();

              if (oldProductError) throw oldProductError;

              if (oldProduct) {
                const restoredStock =
                  Number(oldProduct.qty || 0) + oldQty;

                const { error: restoreError } = await supabase
                  .from("products")
                  .update({
                    qty: restoredStock,
                  })
                  .eq("id", oldProductId);

                if (restoreError) throw restoreError;
              }
            }

            // Kurangi stok produk baru
            if (newProductId && newQty > 0) {
              const { data: newProduct, error: newProductError } =
                await supabase
                  .from("products")
                  .select("qty")
                  .eq("id", newProductId)
                  .single();

              if (newProductError) throw newProductError;

              if (newProduct) {
                const currentNewStock =
                  Number(newProduct.qty || 0);

                if (currentNewStock < newQty) {
                  throw new Error(
                    `Stock produk baru tidak cukup. Stock tersedia ${currentNewStock}`
                  );
                }

                const finalNewStock =
                  currentNewStock - newQty;

                const { error: newStockError } =
                  await supabase
                    .from("products")
                    .update({
                      qty: finalNewStock,
                    })
                    .eq("id", newProductId);

                if (newStockError) throw newStockError;
              }
            }
          }
        }

        toast({
          title: "Success",
          description:
            "Transaction updated successfully",
        });
      }

      setDialogOpen(false);

      await fetchTransactions();

      // Refresh product stock
      const { data: refreshedProducts } = await supabase
        .from("products")
        .select("*");

      setProducts(refreshedProducts || []);
    } catch (err: any) {
      toast({
        title: "Error",
        description:
          err.message || "Failed to save transaction",
        variant: "destructive",
      });
    }
  };

  const formatDate = (
    date: string | null | undefined
  ) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  };

  const rowsPerPage = 10;

  const totalPages =
    Math.ceil(transactions.length / rowsPerPage) || 1;

  const paginatedTransactions = transactions.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  return (
    <div className="space-y-6">

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Penjualan
          </h1>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">

          <Button
            onClick={handleAddTransaction}
            className="flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Penjualan
          </Button>

          <XlsxTable
            data={transactions}
            columns={[
              {
                header: "Nomor Transaksi",
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
                header: "Tanggal",
                key: "created_at",
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
                header: "Payment Method",
                key: "payment_method",
              },
              {
                header: "Status",
                key: "status",
              },
            ]}
            filename="penjualan.xlsx"
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

      <div className="w-full max-w-sm">
        <Search
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(e.target.value)
          }
          placeholder="Search sales..."
          className="w-full"
        />
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p>{error}</p>
        </div>
      )}

      {!loading && transactions.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          No transactions found
        </div>
      )}

      {!loading && transactions.length > 0 && (
        <Table>

          <TableHeader>
            <TableRow>

              <TableCell className="font-semibold">
                Transaction No
              </TableCell>

              <TableCell className="font-semibold">
                Customer
              </TableCell>

              <TableCell className="font-semibold">
                Invoice
              </TableCell>

              <TableCell className="font-semibold">
                Tanggal
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

            {paginatedTransactions.map(
              (transaction) => (
                <TableRow key={transaction.id}>

                  <TableCell className="font-medium">
                    {transaction.transaction_number}
                  </TableCell>

                  <TableCell>
                    {transaction.customer_name || "-"}
                  </TableCell>

                  <TableCell>
                    {transaction.invoice_number || "-"}
                  </TableCell>

                  <TableCell>
                    {formatDate(transaction.created_at)}
                  </TableCell>

                  <TableCell>
                    {transaction.product_name || "-"}
                  </TableCell>

                  <TableCell>
                    {transaction.product_code || "-"}
                  </TableCell>

                  <TableCell className="text-right">
                    {transaction.qty?.toLocaleString() ||
                      "0"}
                  </TableCell>

                  <TableCell className="text-right">
                    Rp{" "}
                    {Number(
                      transaction.total_price || 0
                    ).toLocaleString()}
                  </TableCell>

                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        transaction.payment_method ===
                        "Cash"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {transaction.payment_method}
                    </span>
                  </TableCell>

                  <TableCell>
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
                      {transaction.status}
                    </span>
                  </TableCell>

                  <TableCell className="flex justify-center space-x-2">

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleEditTransaction(
                          transaction
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
                          transaction.id
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

      {!loading && transactions.length > 0 && (
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
              length: totalPages,
            }).map((_, i) => (
              <PaginationItem key={i}>

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

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      >

        <DialogContent className="w-full max-w-lg">

          <DialogHeader>

            <DialogTitle>
              {dialogMode === "add"
                ? "Add Sales Transaction"
                : "Edit Sales Transaction"}
            </DialogTitle>

            <DialogDescription>
              Fill in transaction details below
            </DialogDescription>

          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >

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
                    let value = e.target.value;

                    if (!value.startsWith("INV-")) {
                      value = "INV-" + value.replace(/^INV-/i, "");
                    }

                    setFormData({
                      ...formData,
                      transaction_number: value,
                    });
                  }}
                  onFocus={() => {
                    if (
                      !formData.transaction_number.startsWith(
                        "INV-"
                      )
                    ) {
                      setFormData({
                        ...formData,
                        transaction_number:
                          "INV-",
                      });
                    }
                  }}
                  required
                />

                <p className="text-xs text-gray-500 mt-1">
                  Format: INV- + nomor yang kamu masukkan sendiri
                </p>

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
                  placeholder="Customer name"
                />

              </div>

            </div>

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

            <div>

              <label className="block text-sm font-medium mb-1">
                Select Product *
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
                      (Stock: {p.qty})
                    </SelectItem>
                  ))}

                </SelectContent>

              </Select>

            </div>

            <div className="grid grid-cols-3 gap-4">

              <div>

                <label className="block text-sm font-medium mb-1">
                  Qty *
                </label>

                <Input
                  type="number"
                  min="1"
                  value={formData.qty}
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
                  value={formData.price}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      price:
                        Number(
                          e.target.value
                        ) || 0,
                      total_price:
                        prev.qty *
                        (Number(
                          e.target.value
                        ) || 0),
                    }))
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

            <div className="grid grid-cols-2 gap-4">

              <div>

                <label className="block text-sm font-medium mb-1">
                  Payment Method
                </label>

                <Select
                  value={
                    formData.payment_method
                  }
                  onValueChange={(val) =>
                    setFormData({
                      ...formData,
                      payment_method:
                        val,
                    })
                  }
                >

                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Payment" />
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
                  value={formData.status}
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

            <div className="flex justify-end space-x-3 pt-4">

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setDialogOpen(false)
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

export default Penjualan;
