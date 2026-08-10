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

const BarangMasuk = () => {
  const [transactions, setTransactions] = useState<
    BarangMasukItem[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(
    null
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] =
    useState(false);

  const [dialogMode, setDialogMode] =
    useState<"add" | "edit">("add");

  const [page, setPage] = useState(1);

  const [products, setProducts] = useState<any[]>(
    []
  );

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const { toast } = useToast();

  /*
   * DATA UTAMA ORDER
   */
  const [formData, setFormData] = useState({
    transaction_number: "",
    supplier_name: "",
    invoice_number: "",
    status: "Menunggu Konfirmasi",
    notes: "",
  });

  /*
   * DAFTAR PRODUK DALAM SATU ORDER
   */
  const [orderItems, setOrderItems] = useState<
    OrderItem[]
  >([
    {
      product_id: "",
      product_name: "",
      product_code: "",
      qty: 0,
      price: 0,
      total_price: 0,
    },
  ]);

  /*
   * ============================
   * FETCH TRANSACTIONS
   * ============================
   */

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("barang_masuk")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

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

  /*
   * ============================
   * FETCH PRODUCTS
   * ============================
   */

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } =
          await supabase
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

  /*
   * ============================
   * PRODUCT CHANGE
   * ============================
   */

  const handleProductChange = (
    index: number,
    productId: string
  ) => {
    const product = products.find(
      (prod) => prod.id === productId
    );

    if (!product) {
      setOrderItems((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                product_id: productId,
              }
            : item
        )
      );

      return;
    }

    const price = product.price || 0;

    setOrderItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              product_id: productId,
              product_name:
                product.description || "",
              product_code: product.code || "",
              price,
              total_price:
                item.qty * price,
            }
          : item
      )
    );
  };

  /*
   * ============================
   * QTY CHANGE
   * ============================
   */

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
                qty * item.price,
            }
          : item
      )
    );
  };

  /*
   * ============================
   * PRICE CHANGE
   * ============================
   */

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
                item.qty * price,
            }
          : item
      )
    );
  };

  /*
   * ============================
   * ADD PRODUCT ROW
   * ============================
   */

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

  /*
   * ============================
   * REMOVE PRODUCT ROW
   * ============================
   */

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

  /*
   * ============================
   * TOTAL ORDER
   * ============================
   */

  const orderTotal = orderItems.reduce(
    (total, item) =>
      total +
      Number(item.total_price || 0),
    0
  );

  /*
   * ============================
   * ADD TRANSACTION
   * ============================
   */

  const handleAddTransaction = () => {
    setDialogMode("add");
    setEditingId(null);

    setFormData({
      transaction_number: `BM-${Date.now()
        .toString()
        .slice(-6)}`,
      supplier_name: "",
      invoice_number: "",
      status: "Menunggu Konfirmasi",
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

  /*
   * ============================
   * EDIT TRANSACTION
   * ============================
   *
   * Edit tetap seperti sebelumnya:
   * satu row/product.
   */

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
      status:
        transaction.status ||
        "Menunggu Konfirmasi",
      notes:
        transaction.notes || "",
    });

    setOrderItems([
      {
        product_id:
          transaction.product_id || "",
        product_name:
          transaction.product_name || "",
        product_code:
          transaction.product_code || "",
        qty: transaction.qty || 0,
        price: transaction.price || 0,
        total_price:
          transaction.total_price || 0,
      },
    ]);

    setEditingId(transaction.id);
    setDialogOpen(true);
  };

  /*
   * ============================
   * DELETE TRANSACTION
   * ============================
   */

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
      const { error } = await supabase
        .from("barang_masuk")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchTransactions();

      toast({
        title: "Success",
        description:
          "Transaction deleted successfully",
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

  /*
   * ============================
   * SUBMIT
   * ============================
   */

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {
      /*
       * Pastikan ada product.
       */

      if (orderItems.length === 0) {
        toast({
          title: "Error",
          description:
            "Please add at least one product.",
          variant: "destructive",
        });

        return;
      }

      /*
       * Pastikan semua product sudah dipilih.
       */

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

      /*
       * Pastikan Qty > 0.
       */

      const invalidQty =
        orderItems.some(
          (item) =>
            !item.qty ||
            Number(item.qty) <= 0
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

      /*
       * ============================
       * EDIT
       * ============================
       */

      if (
        dialogMode === "edit" &&
        editingId
      ) {
        const item = orderItems[0];

        const payload = {
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

          qty: item.qty,

          price: item.price,

          total_price:
            item.total_price,

          status: formData.status,

          notes: formData.notes,
        };

        const { error } =
          await supabase
            .from("barang_masuk")
            .update(payload)
            .eq("id", editingId);

        if (error) throw error;

        toast({
          title: "Success",
          description:
            "Transaction updated successfully",
        });
      }

      /*
       * ============================
       * ADD MULTIPLE PRODUCTS
       * ============================
       */

      else {
        const payloads =
          orderItems.map((item) => ({
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

            qty: item.qty,

            price: item.price,

            total_price:
              item.total_price,

            status:
              formData.status,

            notes: formData.notes,
          }));

        const { error } =
          await supabase
            .from("barang_masuk")
            .insert(payloads);

        if (error) throw error;

        toast({
          title: "Success",
          description:
            `${orderItems.length} product${
              orderItems.length > 1
                ? "s"
                : ""
            } added successfully`,
        });
      }

      setDialogOpen(false);

      await fetchTransactions();
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

  /*
   * ============================
   * PAGINATION
   * ============================
   */

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

  /*
   * ============================
   * UI
   * ============================
   */

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Barang Masuk
          </h1>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">
          <Button
            onClick={
              handleAddTransaction
            }
            className="flex items-center"
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

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p>{error}</p>
        </div>
      )}

      {!loading &&
        transactions.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            No transactions found
          </div>
        )}

      {!loading &&
        transactions.length > 0 && (
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

      {/* ============================ */}
      {/* DIALOG */}
      {/* ============================ */}

      <Dialog
        open={dialogOpen}
        onOpenChange={
          setDialogOpen
        }
      >
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "add"
                ? "Add Barang Masuk"
                : "Edit Barang Masuk"}
            </DialogTitle>

            <DialogDescription>
              {dialogMode === "add"
                ? "Add one or more products to this order"
                : "Fill in transaction details below"}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={
              handleSubmit
            }
            className="space-y-5"
          >
            {/* TRANSACTION + INVOICE */}

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
                        e.target
                          .value,
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
                        e.target
                          .value,
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
                      e.target
                        .value,
                  })
                }
                placeholder="Supplier name"
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
                    Add multiple products
                    to this order
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
                (item, index) => (
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
                                key={p.id}
                                value={
                                  p.id
                                }
                              >
                                {p.code} -{" "}
                                {
                                  p.description
                                }
                                {p.qty !==
                                  undefined &&
                                  ` (Stock: ${p.qty})`}
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
                          min="0"
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

            {/* STATUS */}

            <div>
              <label className="block text-sm font-medium mb-1">
                Status
              </label>

              <Select
                value={
                  formData.status
                }
                onValueChange={(
                  val
                ) =>
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

export default BarangMasuk;
