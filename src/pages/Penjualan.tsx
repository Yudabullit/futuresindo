import { useEffect, useState } from "react";
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
} from "lucide-react";

import { XlsxTable } from "@/components/ui/xlsx-table";


// ============================================================
// TYPE
// ============================================================

type DialogMode = "add" | "edit";

interface Product {
  id: string;
  code: string;
  description: string;
  qty: number;
  price: number;
}

interface FormData {
  transaction_number: string;
  customer_name: string;
  invoice_number: string;

  product_id: string;
  product_name: string;
  product_code: string;

  qty: number;
  price: number;
  total_price: number;

  payment_method: string;
  status: string;
  notes: string;
}


// ============================================================
// COMPONENT
// ============================================================

const Penjualan = () => {
  // ==========================================================
  // STATE
  // ==========================================================

  const [transactions, setTransactions] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] =
    useState<DialogMode>("add");

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [page, setPage] = useState(1);

  const { toast } = useToast();


  // ==========================================================
  // FORM DATA
  // ==========================================================

  const emptyFormData = (): FormData => ({
    transaction_number: "",
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

  const [formData, setFormData] =
    useState<FormData>(emptyFormData());


  // ==========================================================
  // FETCH TRANSACTIONS
  // ==========================================================

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("penjualan")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (searchTerm.trim()) {
        const search = searchTerm.trim();

        query = query.or(
          `transaction_number.ilike.%${search}%,customer_name.ilike.%${search}%,invoice_number.ilike.%${search}%,product_name.ilike.%${search}%,product_code.ilike.%${search}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setTransactions(data || []);

    } catch (err: any) {

      console.error(
        "fetchTransactions error:",
        err
      );

      setError(
        err?.message ||
          "Failed to load sales transactions"
      );

      setTransactions([]);

    } finally {

      setLoading(false);

    }
  };


  // ==========================================================
  // FETCH PRODUCTS
  // ==========================================================

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select(
          "id, code, description, qty, price"
        )
        .order("description", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      setProducts(
        (data || []) as Product[]
      );

    } catch (err: any) {

      console.error(
        "fetchProducts error:",
        err
      );

      toast({
        title: "Error",
        description:
          err?.message ||
          "Failed to load products",
        variant: "destructive",
      });

    } finally {

      setProductsLoading(false);

    }
  };


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    fetchTransactions();
  }, [searchTerm]);


  useEffect(() => {
    fetchProducts();
  }, []);


  // ==========================================================
  // RESET PAGE WHEN SEARCH CHANGES
  // ==========================================================

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);


  // ==========================================================
  // PRODUCT CHANGE
  // ==========================================================

  const handleProductChange = (
    productId: string
  ) => {

    const product = products.find(
      (p) => p.id === productId
    );

    if (!product) {
      return;
    }

    setFormData((prev) => ({
      ...prev,

      product_id: product.id,

      product_name:
        product.description || "",

      product_code:
        product.code || "",

      price:
        Number(product.price) || 0,

      total_price:
        (Number(prev.qty) || 0) *
        (Number(product.price) || 0),
    }));
  };


  // ==========================================================
  // QTY CHANGE
  // ==========================================================

  const handleQtyChange = (
    value: string
  ) => {

    const qty =
      Number(value) || 0;

    setFormData((prev) => ({
      ...prev,

      qty,

      total_price:
        qty *
        (Number(prev.price) || 0),
    }));
  };


  // ==========================================================
  // PRICE CHANGE
  // ==========================================================

  const handlePriceChange = (
    value: string
  ) => {

    const price =
      Number(value) || 0;

    setFormData((prev) => ({
      ...prev,

      price,

      total_price:
        (Number(prev.qty) || 0) *
        price,
    }));
  };


  // ==========================================================
  // ADD TRANSACTION
  // ==========================================================

  const handleAddTransaction = () => {

    setDialogMode("add");

    setEditingId(null);

    setFormData({
      transaction_number:
        `PJ-${Date.now()
          .toString()
          .slice(-6)}`,

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


  // ==========================================================
  // EDIT TRANSACTION
  // ==========================================================

  const handleEditTransaction = (
    transaction: any
  ) => {

    setDialogMode("edit");

    setEditingId(
      transaction.id
    );

    setFormData({
      transaction_number:
        transaction.transaction_number ||
        "",

      customer_name:
        transaction.customer_name ||
        "",

      invoice_number:
        transaction.invoice_number ||
        "",

      product_id:
        transaction.product_id ||
        "",

      product_name:
        transaction.product_name ||
        "",

      product_code:
        transaction.product_code ||
        "",

      qty:
        Number(transaction.qty) ||
        0,

      price:
        Number(transaction.price) ||
        0,

      total_price:
        Number(transaction.total_price) ||
        0,

      payment_method:
        transaction.payment_method ||
        "Cash",

      status:
        transaction.status ||
        "Prepared",

      notes:
        transaction.notes ||
        "",
    });

    setDialogOpen(true);
  };


  // ==========================================================
  // DELETE TRANSACTION
  // ==========================================================

  const handleDeleteTransaction = async (
    id: string
  ) => {

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this transaction?"
      );

    if (!confirmed) {
      return;
    }

    try {

      /*
       * IMPORTANT
       *
       * Kita TIDAK mengubah products.qty di sini.
       *
       * DELETE akan ditangani oleh:
       *
       * PostgreSQL trigger
       *
       * Jika transaksi sebelumnya sudah
       * mengurangi stock:
       *
       * Sent / Received
       *       ↓
       * stock dikembalikan
       *
       * Jika Prepared:
       *       ↓
       * tidak ada perubahan stock
       */

      const {
        error,
      } = await supabase
        .from("penjualan")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      await fetchTransactions();

      await fetchProducts();

      toast({
        title: "Success",
        description:
          "Transaction deleted successfully",
      });

    } catch (err: any) {

      console.error(
        "delete transaction error:",
        err
      );

      toast({
        title: "Error",
        description:
          err?.message ||
          "Failed to delete transaction",
        variant: "destructive",
      });
    }
  };


  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!formData.transaction_number.trim()) {

      toast({
        title: "Error",
        description:
          "Transaction number is required",
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


    if (
      !formData.qty ||
      formData.qty <= 0
    ) {

      toast({
        title: "Error",
        description:
          "Quantity must be greater than 0",
        variant: "destructive",
      });

      return;
    }


    if (
      formData.price < 0
    ) {

      toast({
        title: "Error",
        description:
          "Price cannot be negative",
        variant: "destructive",
      });

      return;
    }


    // --------------------------------------------------------
    // TOTAL PRICE
    // --------------------------------------------------------

    const totalPrice =
      Number(formData.qty) *
      Number(formData.price);


    try {

      // ======================================================
      // IMPORTANT
      //
      // Jangan masukkan products.qty ke payload.
      //
      // React hanya menyimpan transaksi.
      //
      // Stock diatur oleh PostgreSQL trigger.
      // ======================================================

      const payload = {
        transaction_number:
          formData.transaction_number.trim(),

        customer_name:
          formData.customer_name.trim(),

        invoice_number:
          formData.invoice_number.trim(),

        product_id:
          formData.product_id,

        product_name:
          formData.product_name,

        product_code:
          formData.product_code,

        qty:
          Number(formData.qty),

        price:
          Number(formData.price),

        total_price:
          totalPrice,

        payment_method:
          formData.payment_method,

        status:
          formData.status,

        notes:
          formData.notes.trim(),
      };


      // ======================================================
      // ADD
      // ======================================================

      if (
        dialogMode === "add"
      ) {

        /*
         * INSERT hanya ke penjualan.
         *
         * Jangan update products di sini.
         *
         * Trigger database yang menentukan:
         *
         * Prepared  = 0
         * Sent      = -Qty
         * Received  = -Qty
         */

        const {
          error,
        } = await supabase
          .from("penjualan")
          .insert(payload);

        if (error) {
          throw error;
        }


        toast({
          title: "Success",
          description:
            "Sales transaction added successfully",
        });
      }


      // ======================================================
      // EDIT
      // ======================================================

      else if (
        dialogMode === "edit" &&
        editingId
      ) {

        /*
         * UPDATE hanya mengubah row penjualan.
         *
         * PostgreSQL trigger akan menghitung
         * perubahan stock berdasarkan OLD dan NEW.
         *
         * Contoh:
         *
         * Sent → Sent
         * 100 → 100
         * = 0
         *
         * Received → Received
         * 100 → 100
         * = 0
         *
         * Sent → Prepared
         * 100 → 100
         * = +100
         *
         * Prepared → Sent
         * 100 → 100
         * = -100
         */

        const {
          error,
        } = await supabase
          .from("penjualan")
          .update(payload)
          .eq("id", editingId);

        if (error) {
          throw error;
        }


        toast({
          title: "Success",
          description:
            "Sales transaction updated successfully",
        });
      }


      // ======================================================
      // CLOSE + REFRESH
      // ======================================================

      setDialogOpen(false);

      setEditingId(null);

      await fetchTransactions();

      /*
       * Refresh product list supaya Stock di
       * dropdown langsung mengikuti products.qty terbaru.
       */
      await fetchProducts();

    } catch (err: any) {

      console.error(
        "save transaction error:",
        err
      );

      toast({
        title: "Error",
        description:
          err?.message ||
          "Failed to save transaction",
        variant: "destructive",
      });
    }
  };


  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  const formatDate = (
    date: string | null | undefined
  ) => {

    if (!date) {
      return "-";
    }

    try {

      return new Date(
        date
      ).toLocaleDateString(
        "id-ID",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }
      );

    } catch {

      return "-";

    }
  };


  // ==========================================================
  // PAGINATION
  // ==========================================================

  const rowsPerPage = 10;

  const totalPages =
    Math.ceil(
      transactions.length /
        rowsPerPage
    ) || 1;

  const paginatedTransactions =
    transactions.slice(
      (page - 1) *
        rowsPerPage,

      page *
        rowsPerPage
    );


  // ==========================================================
  // STATUS STYLE
  // ==========================================================

  const getStatusClass = (
    status: string
  ) => {

    switch (status) {

      case "Received":

        return "bg-green-100 text-green-800";

      case "Sent":

        return "bg-yellow-100 text-yellow-800";

      case "Prepared":

        return "bg-blue-100 text-blue-800";

      default:

        return "bg-gray-100 text-gray-800";
    }
  };


  // ==========================================================
  // PAYMENT STYLE
  // ==========================================================

  const getPaymentClass = (
    payment: string
  ) => {

    switch (payment) {

      case "Cash":

        return "bg-blue-100 text-blue-800";

      case "Transfer":

        return "bg-green-100 text-green-800";

      case "Credit":

        return "bg-yellow-100 text-yellow-800";

      default:

        return "bg-gray-100 text-gray-800";
    }
  };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-6">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">

        <div>

          <h1 className="text-2xl font-bold">
            Penjualan
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage sales transactions and inventory
          </p>

        </div>


        <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">

          {/* ==================================================
              ADD BUTTON
          ================================================== */}

          <Button
            onClick={
              handleAddTransaction
            }
            className="flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />

            Tambah Penjualan
          </Button>


          {/* ==================================================
              EXPORT
          ================================================== */}

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
                header:
                  "Customer",
                key:
                  "customer_name",
              },

              {
                header:
                  "Invoice",
                key:
                  "invoice_number",
              },

              {
                header:
                  "Tanggal",
                key:
                  "created_at",
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
                  "Payment Method",
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


      {/* ====================================================
          SEARCH
      ==================================================== */}

      <div className="w-full max-w-sm">

        <Search
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(
              e.target.value
            )
          }
          placeholder="Search sales..."
          className="w-full"
        />

      </div>


      {/* ====================================================
          ERROR
      ==================================================== */}

      {error && (

        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">

          <p>{error}</p>

        </div>

      )}


      {/* ====================================================
          LOADING
      ==================================================== */}

      {loading && (

        <div className="text-center py-10 text-gray-500">

          Loading transactions...

        </div>

      )}


      {/* ====================================================
          EMPTY
      ==================================================== */}

      {!loading &&
        transactions.length === 0 && (

          <div className="text-center py-10 text-gray-500">

            No transactions found

          </div>

        )}


      {/* ====================================================
          TABLE
      ==================================================== */}

      {!loading &&
        transactions.length > 0 && (

          <div className="overflow-x-auto">

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

                    <TableRow
                      key={
                        transaction.id
                      }
                    >

                      {/* TRANSACTION */}

                      <TableCell className="font-medium">

                        {
                          transaction.transaction_number ||
                          "-"
                        }

                      </TableCell>


                      {/* CUSTOMER */}

                      <TableCell>

                        {
                          transaction.customer_name ||
                          "-"
                        }

                      </TableCell>


                      {/* INVOICE */}

                      <TableCell>

                        {
                          transaction.invoice_number ||
                          "-"
                        }

                      </TableCell>


                      {/* DATE */}

                      <TableCell>

                        {formatDate(
                          transaction.created_at
                        )}

                      </TableCell>


                      {/* PRODUCT */}

                      <TableCell>

                        {
                          transaction.product_name ||
                          "-"
                        }

                      </TableCell>


                      {/* CODE */}

                      <TableCell>

                        {
                          transaction.product_code ||
                          "-"
                        }

                      </TableCell>


                      {/* QTY */}

                      <TableCell className="text-right">

                        {Number(
                          transaction.qty || 0
                        ).toLocaleString(
                          "id-ID"
                        )}

                      </TableCell>


                      {/* TOTAL */}

                      <TableCell className="text-right">

                        Rp{" "}

                        {Number(
                          transaction.total_price ||
                            0
                        ).toLocaleString(
                          "id-ID"
                        )}

                      </TableCell>


                      {/* PAYMENT */}

                      <TableCell>

                        <span
                          className={`px-2 py-1 rounded text-xs ${getPaymentClass(
                            transaction.payment_method
                          )}`}
                        >

                          {
                            transaction.payment_method ||
                            "-"
                          }

                        </span>

                      </TableCell>


                      {/* STATUS */}

                      <TableCell>

                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(
                            transaction.status
                          )}`}
                        >

                          {
                            transaction.status ||
                            "-"
                          }

                        </span>

                      </TableCell>


                      {/* ACTIONS */}

                      <TableCell>

                        <div className="flex justify-center space-x-2">

                          {/* EDIT */}

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


                          {/* DELETE */}

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

                        </div>

                      </TableCell>

                    </TableRow>

                  )
                )}

              </TableBody>

            </Table>

          </div>

        )}


      {/* ====================================================
          PAGINATION
      ==================================================== */}

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


      {/* ====================================================
          DIALOG
      ==================================================== */}

      <Dialog
        open={dialogOpen}
        onOpenChange={
          setDialogOpen
        }
      >

        <DialogContent className="w-full max-w-lg">

          <DialogHeader>

            <DialogTitle>

              {dialogMode ===
              "add"
                ? "Add Sales Transaction"
                : "Edit Sales Transaction"}

            </DialogTitle>

            <DialogDescription>

              Fill in transaction details below

            </DialogDescription>

          </DialogHeader>


          {/* ==================================================
              FORM
          ================================================== */}

          <form
            onSubmit={
              handleSubmit
            }
            className="space-y-4"
          >

            {/* =================================================
                TRANSACTION + CUSTOMER
            ================================================= */}

            <div className="grid grid-cols-2 gap-4">

              <div>

                <label className="block text-sm font-medium mb-1">

                  Transaction No *

                </label>

                <Input
                  value={
                    formData.transaction_number
                  }
                  onChange={(e) =>
                    setFormData(
                      (prev) => ({
                        ...prev,

                        transaction_number:
                          e.target.value,
                      })
                    )
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
                    setFormData(
                      (prev) => ({
                        ...prev,

                        customer_name:
                          e.target.value,
                      })
                    )
                  }
                  placeholder="Customer name"
                />

              </div>

            </div>


            {/* =================================================
                INVOICE
            ================================================= */}

            <div>

              <label className="block text-sm font-medium mb-1">

                Invoice

              </label>

              <Input
                value={
                  formData.invoice_number
                }
                onChange={(e) =>
                  setFormData(
                    (prev) => ({
                      ...prev,

                      invoice_number:
                        e.target.value,
                    })
                  )
                }
                placeholder="Invoice number"
              />

            </div>


            {/* =================================================
                PRODUCT
            ================================================= */}

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
                disabled={
                  productsLoading
                }
              >

                <SelectTrigger className="w-full">

                  <SelectValue
                    placeholder={
                      productsLoading
                        ? "Loading products..."
                        : "Choose a product"
                    }
                  />

                </SelectTrigger>


                <SelectContent>

                  {products.map(
                    (product) => (

                      <SelectItem
                        key={
                          product.id
                        }
                        value={
                          product.id
                        }
                      >

                        {product.code}

                        {" - "}

                        {product.description}

                        {" (Stock: "}

                        {Number(
                          product.qty || 0
                        ).toLocaleString(
                          "id-ID"
                        )}

                        {")"}

                      </SelectItem>

                    )
                  )}

                </SelectContent>

              </Select>

            </div>


            {/* =================================================
                QTY / PRICE / TOTAL
            ================================================= */}

            <div className="grid grid-cols-3 gap-4">

              {/* QTY */}

              <div>

                <label className="block text-sm font-medium mb-1">

                  Qty *

                </label>

                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={
                    formData.qty || ""
                  }
                  onChange={(e) =>
                    handleQtyChange(
                      e.target.value
                    )
                  }
                  required
                />

              </div>


              {/* PRICE */}

              <div>

                <label className="block text-sm font-medium mb-1">

                  Price *

                </label>

                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={
                    formData.price
                  }
                  onChange={(e) =>
                    handlePriceChange(
                      e.target.value
                    )
                  }
                  required
                />

              </div>


              {/* TOTAL */}

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


            {/* =================================================
                PAYMENT + STATUS
            ================================================= */}

            <div className="grid grid-cols-2 gap-4">

              {/* PAYMENT */}

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
                    setFormData(
                      (prev) => ({
                        ...prev,

                        payment_method:
                          value,
                      })
                    )
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
                    value
                  ) =>
                    setFormData(
                      (prev) => ({
                        ...prev,

                        status:
                          value,
                      })
                    )
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


            {/* =================================================
                NOTES
            ================================================= */}

            <div>

              <label className="block text-sm font-medium mb-1">

                Notes

              </label>

              <Input
                value={
                  formData.notes
                }
                onChange={(e) =>
                  setFormData(
                    (prev) => ({
                      ...prev,

                      notes:
                        e.target.value,
                    })
                  )
                }
                placeholder="Notes"
              />

            </div>


            {/* =================================================
                BUTTONS
            ================================================= */}

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


              <Button
                type="submit"
              >

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
