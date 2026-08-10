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
    transaction_number: "",
    customer_name: "",
    invoice_number: "",
    payment_method: "Cash",
    status: "Prepared",
    notes: "",
  });

  /*
   * Multiple products dalam satu order.
   */
  const [orderItems, setOrderItems] = useState<any[]>([
    {
      product_id: "",
      product_name: "",
      product_code: "",
      qty: 0,
      price: 0,
      total_price: 0,
    },
  ]);

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

  /*
   * Menambahkan product baru ke order.
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
   * Menghapus product dari order.
   * Minimal satu product tetap dipertahankan.
   */
  const handleRemoveProductRow = (index: number) => {
    if (orderItems.length === 1) {
      return;
    }

    setOrderItems((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  /*
   * Memilih product pada baris tertentu.
   */
  const handleProductChange = (
    index: number,
    productId: string
  ) => {
    const product = products.find(
      (p) => p.id === productId
    );

    if (!product) return;

    setOrderItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        const price = product.price || 0;

        return {
          ...item,
          product_id: productId,
          product_name: product.description,
          product_code: product.code,
          price,
          total_price: item.qty * price,
        };
      })
    );
  };

  /*
   * Mengubah Qty product tertentu.
   */
  const handleQtyChange = (
    index: number,
    qty: number
  ) => {
    setOrderItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        return {
          ...item,
          qty,
          total_price: qty * item.price,
        };
      })
    );
  };

  /*
   * Mengubah price product tertentu.
   */
  const handlePriceChange = (
    index: number,
    price: number
  ) => {
    setOrderItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        return {
          ...item,
          price,
          total_price: item.qty * price,
        };
      })
    );
  };

  /*
   * Total seluruh order.
   */
  const orderTotal = orderItems.reduce(
    (sum, item) =>
      sum + Number(item.total_price || 0),
    0
  );

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

  /*
   * Edit tetap mengedit satu row/product seperti sebelumnya.
   */
  const handleEditTransaction = (
    transaction: any
  ) => {
    setDialogMode("edit");

    setFormData({
      transaction_number:
        transaction.transaction_number,
      customer_name:
        transaction.customer_name || "",
      invoice_number:
        transaction.invoice_number || "",
      payment_method:
        transaction.payment_method || "Cash",
      status:
        transaction.status || "Prepared",
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
        qty:
          transaction.qty || 0,
        price:
          transaction.price || 0,
        total_price:
          transaction.total_price || 0,
      },
    ]);

    setEditingId(transaction.id);
    setDialogOpen(true);
  };

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
        .from("penjualan")
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
   * Save transaction.
   *
   * ADD:
   * Satu order dapat membuat beberapa row
   * di tabel penjualan.
   *
   * EDIT:
   * Tetap update satu row seperti sebelumnya.
   */
  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {
      /*
       * Validasi minimal satu product.
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
      const invalidProduct = orderItems.some(
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
       * Pastikan Qty valid.
       */
      const invalidQty = orderItems.some(
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
       * EDIT
       */
      if (
        dialogMode === "edit" &&
        editingId
      ) {
        const item = orderItems[0];

        const payload = {
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
          qty:
            item.qty,
          price:
            item.price,
          total_price:
            item.total_price,
          payment_method:
            formData.payment_method,
          status:
            formData.status,
          notes:
            formData.notes,
        };

        const { error } = await supabase
          .from("penjualan")
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
       * ADD
       *
       * Setiap product menjadi satu row,
       * tetapi transaction_number dan invoice_number
       * sama untuk semua row.
       */
      else {
        const payloads = orderItems.map(
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

            qty:
              item.qty,

            price:
              item.price,

            total_price:
              item.total_price,

            payment_method:
              formData.payment_method,

            status:
              formData.status,

            notes:
              formData.notes,
          })
        );

        const { error } = await supabase
          .from("penjualan")
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
   * GROUPING ORDER
   *
   * Beberapa row dengan transaction_number
   * yang sama akan ditampilkan sebagai 1 order
   * di tabel.
   *
   * Database TIDAK diubah.
   */
  const groupedTransactions =
    transactions.reduce(
      (groups, transaction) => {
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

        groups[key].products.push({
          id: transaction.id,
          product_name:
            transaction.product_name,
          product_code:
            transaction.product_code,
          qty: Number(
            transaction.qty || 0
          ),
          price: Number(
            transaction.price || 0
          ),
          total_price: Number(
            transaction.total_price || 0
          ),
        });

        groups[key].total_qty += Number(
          transaction.qty || 0
        );

        groups[key].total_price += Number(
          transaction.total_price || 0
        );

        return groups;
      },
      {} as Record<string, any>
    );

  const groupedTransactionList =
    Object.values(groupedTransactions);

  const rowsPerPage = 10;

  const totalPages =
    Math.ceil(
      groupedTransactionList.length /
        rowsPerPage
    ) || 1;

  const paginatedTransactions =
    groupedTransactionList.slice(
      (page - 1) * rowsPerPage,
      page * rowsPerPage
    );

  return (
    <div>
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
                header: "Total Price",
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

      <div className="w-full max-w-sm mt-4">
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
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mt-4">
          <p>{error}</p>
        </div>
      )}

      {!loading &&
        groupedTransactionList.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            No transactions found
          </div>
        )}

      {!loading &&
        groupedTransactionList.length > 0 && (
          <div className="mt-4">
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
                  (transaction: any) => (
                    <TableRow
                      key={
                        transaction.transaction_number
                      }
                    >
                      <TableCell className="font-medium align-top">
                        {
                          transaction.transaction_number
                        }
                      </TableCell>

                      <TableCell className="align-top">
                        {
                          transaction.customer_name ||
                          "-"
                        }
                      </TableCell>

                      <TableCell className="align-top">
                        {
                          transaction.invoice_number ||
                          "-"
                        }
                      </TableCell>

                      <TableCell className="align-top">
                        <div className="space-y-1">
                          {transaction.products.map(
                            (
                              product: any,
                              index: number
                            ) => (
                              <div
                                key={index}
                                className="min-h-[24px]"
                              >
                                {product.product_name ||
                                  "-"}
                              </div>
                            )
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="align-top">
                        <div className="space-y-1">
                          {transaction.products.map(
                            (
                              product: any,
                              index: number
                            ) => (
                              <div
                                key={index}
                                className="min-h-[24px]"
                              >
                                {product.product_code ||
                                  "-"}
                              </div>
                            )
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right align-top">
                        <div className="space-y-1">
                          {transaction.products.map(
                            (
                              product: any,
                              index: number
                            ) => (
                              <div
                                key={index}
                                className="min-h-[24px]"
                              >
                                {product.qty.toLocaleString()}
                              </div>
                            )
                          )}

                          {transaction.products.length >
                            1 && (
                            <div className="border-t mt-2 pt-1 font-bold">
                              {transaction.total_qty.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right align-top">
                        <div className="space-y-1">
                          {transaction.products.map(
                            (
                              product: any,
                              index: number
                            ) => (
                              <div
                                key={index}
                                className="min-h-[24px]"
                              >
                                Rp{" "}
                                {product.total_price.toLocaleString(
                                  "id-ID"
                                )}
                              </div>
                            )
                          )}

                          {transaction.products.length >
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

                      <TableCell className="align-top">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            transaction.payment_method ===
                            "Cash"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {
                            transaction.payment_method
                          }
                        </span>
                      </TableCell>

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

                      <TableCell className="align-top">
                        <div className="flex justify-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleEditTransaction(
                                transaction
                                  .products[0]
                                  ? {
                                      ...transaction,
                                      ...transaction.products[0],
                                      id: transaction.products[0].id,
                                    }
                                  : transaction
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
                                transaction
                                  .products[0]?.id
                              )
                            }
                            className="px-3"
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

      {!loading &&
        groupedTransactionList.length > 0 && (
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
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "add"
                ? "Add Sales Transaction"
                : "Edit Sales Transaction"}
            </DialogTitle>

            <DialogDescription>
              {dialogMode === "add"
                ? "Add one or more products to this order"
                : "Edit transaction details below"}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
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

            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    Products
                  </h3>

                  <p className="text-sm text-muted-foreground">
                    Add multiple products to
                    this order
                  </p>
                </div>

                {dialogMode === "add" && (
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
                    className="border rounded-lg p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Product {index + 1}
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
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                    </div>

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
                                value={p.id}
                              >
                                {p.code} -{" "}
                                {
                                  p.description
                                }{" "}
                                (Stock:{" "}
                                {p.qty})
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

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

              <div className="flex justify-end border-t pt-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

export default Penjualan;  Trash2,
  Edit3,
  Plus,
  Download,
  X,
} from "lucide-react";
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
    transaction_number: "",
    customer_name: "",
    invoice_number: "",
    payment_method: "Cash",
    status: "Prepared",
    notes: "",
  });

  /*
   * Multiple products dalam satu order.
   */
  const [orderItems, setOrderItems] = useState<any[]>([
    {
      product_id: "",
      product_name: "",
      product_code: "",
      qty: 0,
      price: 0,
      total_price: 0,
    },
  ]);

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

  /*
   * Menambahkan product baru ke order.
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
   * Menghapus product dari order.
   * Minimal satu product tetap dipertahankan.
   */
  const handleRemoveProductRow = (index: number) => {
    if (orderItems.length === 1) {
      return;
    }

    setOrderItems((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  /*
   * Memilih product pada baris tertentu.
   */
  const handleProductChange = (
    index: number,
    productId: string
  ) => {
    const product = products.find(
      (p) => p.id === productId
    );

    if (!product) return;

    setOrderItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        const price = product.price || 0;

        return {
          ...item,
          product_id: productId,
          product_name: product.description,
          product_code: product.code,
          price,
          total_price: item.qty * price,
        };
      })
    );
  };

  /*
   * Mengubah Qty product tertentu.
   */
  const handleQtyChange = (
    index: number,
    qty: number
  ) => {
    setOrderItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        return {
          ...item,
          qty,
          total_price: qty * item.price,
        };
      })
    );
  };

  /*
   * Mengubah price product tertentu.
   */
  const handlePriceChange = (
    index: number,
    price: number
  ) => {
    setOrderItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        return {
          ...item,
          price,
          total_price: item.qty * price,
        };
      })
    );
  };

  /*
   * Total seluruh order.
   */
  const orderTotal = orderItems.reduce(
    (sum, item) =>
      sum + Number(item.total_price || 0),
    0
  );

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

  /*
   * Edit tetap mengedit satu row/product seperti sebelumnya.
   */
  const handleEditTransaction = (
    transaction: any
  ) => {
    setDialogMode("edit");

    setFormData({
      transaction_number:
        transaction.transaction_number,
      customer_name:
        transaction.customer_name || "",
      invoice_number:
        transaction.invoice_number || "",
      payment_method:
        transaction.payment_method || "Cash",
      status:
        transaction.status || "Prepared",
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
        qty:
          transaction.qty || 0,
        price:
          transaction.price || 0,
        total_price:
          transaction.total_price || 0,
      },
    ]);

    setEditingId(transaction.id);
    setDialogOpen(true);
  };

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
        .from("penjualan")
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
   * Save transaction.
   *
   * ADD:
   * Satu order dapat membuat beberapa row
   * di tabel penjualan.
   *
   * EDIT:
   * Tetap update satu row seperti sebelumnya.
   */
  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {
      /*
       * Validasi minimal satu product.
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
      const invalidProduct = orderItems.some(
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
       * Pastikan Qty valid.
       */
      const invalidQty = orderItems.some(
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
       * EDIT
       */
      if (
        dialogMode === "edit" &&
        editingId
      ) {
        const item = orderItems[0];

        const payload = {
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
          qty:
            item.qty,
          price:
            item.price,
          total_price:
            item.total_price,
          payment_method:
            formData.payment_method,
          status:
            formData.status,
          notes:
            formData.notes,
        };

        const { error } = await supabase
          .from("penjualan")
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
       * ADD
       *
       * Setiap product menjadi satu row,
       * tetapi transaction_number dan invoice_number
       * sama untuk semua row.
       */
      else {
        const payloads = orderItems.map(
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

            qty:
              item.qty,

            price:
              item.price,

            total_price:
              item.total_price,

            payment_method:
              formData.payment_method,

            status:
              formData.status,

            notes:
              formData.notes,
          })
        );

        const { error } = await supabase
          .from("penjualan")
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

  const rowsPerPage = 10;

  const totalPages =
    Math.ceil(
      transactions.length / rowsPerPage
    ) || 1;

  const paginatedTransactions =
    transactions.slice(
      (page - 1) * rowsPerPage,
      page * rowsPerPage
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-bold">
          Penjualan
        </h1>

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
                header: "Total Price",
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
                  Customer
                </TableCell>

                <TableCell className="font-semibold">
                  Invoice
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
                  <TableRow
                    key={transaction.id}
                  >
                    <TableCell className="font-medium">
                      {
                        transaction.transaction_number
                      }
                    </TableCell>

                    <TableCell>
                      {
                        transaction.customer_name ||
                        "-"
                      }
                    </TableCell>

                    <TableCell>
                      {
                        transaction.invoice_number ||
                        "-"
                      }
                    </TableCell>

                    <TableCell>
                      {
                        transaction.product_name ||
                        "-"
                      }
                    </TableCell>

                    <TableCell>
                      {
                        transaction.product_code ||
                        "-"
                      }
                    </TableCell>

                    <TableCell className="text-right">
                      {transaction.qty?.toLocaleString() ||
                        "0"}
                    </TableCell>

                    <TableCell className="text-right">
                      Rp{" "}
                      {Number(
                        transaction.total_price ||
                          0
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
                        {
                          transaction.payment_method
                        }
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

      {!loading &&
        transactions.length > 0 && (
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

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      >
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "add"
                ? "Add Sales Transaction"
                : "Edit Sales Transaction"}
            </DialogTitle>

            <DialogDescription>
              {dialogMode === "add"
                ? "Add one or more products to this order"
                : "Edit transaction details below"}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
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

            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    Products
                  </h3>

                  <p className="text-sm text-muted-foreground">
                    Add multiple products to this
                    order
                  </p>
                </div>

                {dialogMode === "add" && (
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
                    className="border rounded-lg p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Product {index + 1}
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
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                    </div>

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
                                value={p.id}
                              >
                                {p.code} -{" "}
                                {
                                  p.description
                                }{" "}
                                (Stock:{" "}
                                {p.qty})
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

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

              <div className="flex justify-end border-t pt-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
