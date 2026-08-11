import { useEffect, useMemo, useState } from "react";
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


// ============================================================
// TYPES
// ============================================================

type DialogMode = "add" | "edit";

interface Product {
  id: string;
  code: string;
  description: string;
  qty: number;
  price: number;
}

interface InvoiceLine {
  id?: string;

  product_id: string;
  product_name: string;
  product_code: string;

  qty: number;
  price: number;
  total_price: number;
}

interface InvoiceForm {
  transaction_number: string;
  customer_name: string;
  invoice_number: string;

  payment_method: string;
  status: string;
  notes: string;

  lines: InvoiceLine[];
}


// ============================================================
// COMPONENT
// ============================================================

const Penjualan = () => {

  // ==========================================================
  // STATE
  // ==========================================================

  const [transactions, setTransactions] =
    useState<any[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [productsLoading, setProductsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [dialogOpen, setDialogOpen] =
    useState(false);

  const [dialogMode, setDialogMode] =
    useState<DialogMode>("add");

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [page, setPage] =
    useState(1);

  const { toast } = useToast();


  // ==========================================================
  // EMPTY FORM
  // ==========================================================

  const createEmptyForm = (): InvoiceForm => ({
    transaction_number:
      `PJ-${Date.now()
        .toString()
        .slice(-6)}`,

    customer_name: "",

    invoice_number: "",

    payment_method: "Cash",

    status: "Prepared",

    notes: "",

    lines: [],
  });


  const [formData, setFormData] =
    useState<InvoiceForm>(
      createEmptyForm()
    );


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

        const search =
          searchTerm.trim();

        query = query.or(
          `transaction_number.ilike.%${search}%,customer_name.ilike.%${search}%,invoice_number.ilike.%${search}%,product_name.ilike.%${search}%,product_code.ilike.%${search}%`
        );
      }

      const {
        data,
        error,
      } = await query;

      if (error) {
        throw error;
      }

      setTransactions(
        data || []
      );

    } catch (err: any) {

      console.error(
        "fetchTransactions:",
        err
      );

      setError(
        err?.message ||
        "Failed to load transactions"
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

      const {
        data,
        error,
      } = await supabase
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
        "fetchProducts:",
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


  useEffect(() => {
    setPage(1);
  }, [searchTerm]);


  // ==========================================================
  // ADD PRODUCT TO CURRENT INVOICE
  // ==========================================================

  const handleAddProductLine = (
    productId: string
  ) => {

    const product =
      products.find(
        (p) =>
          p.id === productId
      );

    if (!product) {
      return;
    }


    // --------------------------------------------------------
    // Prevent duplicate product
    // --------------------------------------------------------

    const alreadyExists =
      formData.lines.some(
        (line) =>
          line.product_id ===
          product.id
      );

    if (alreadyExists) {

      toast({
        title: "Product already added",
        description:
          "Product ini sudah ada di invoice. Ubah Qty pada baris tersebut.",
        variant: "destructive",
      });

      return;
    }


    const newLine: InvoiceLine = {

      product_id:
        product.id,

      product_name:
        product.description || "",

      product_code:
        product.code || "",

      qty: 1,

      price:
        Number(product.price) || 0,

      total_price:
        Number(product.price) || 0,
    };


    setFormData(
      (prev) => ({
        ...prev,

        lines: [
          ...prev.lines,
          newLine,
        ],
      })
    );
  };


  // ==========================================================
  // UPDATE LINE QTY
  // ==========================================================

  const handleLineQtyChange = (
    index: number,
    value: string
  ) => {

    const qty =
      Number(value) || 0;

    setFormData(
      (prev) => {

        const lines =
          [...prev.lines];

        const line =
          lines[index];

        if (!line) {
          return prev;
        }

        lines[index] = {

          ...line,

          qty,

          total_price:
            qty *
            Number(line.price || 0),
        };

        return {
          ...prev,
          lines,
        };
      }
    );
  };


  // ==========================================================
  // UPDATE LINE PRICE
  // ==========================================================

  const handleLinePriceChange = (
    index: number,
    value: string
  ) => {

    const price =
      Number(value) || 0;

    setFormData(
      (prev) => {

        const lines =
          [...prev.lines];

        const line =
          lines[index];

        if (!line) {
          return prev;
        }

        lines[index] = {

          ...line,

          price,

          total_price:
            Number(line.qty || 0) *
            price,
        };

        return {
          ...prev,
          lines,
        };
      }
    );
  };


  // ==========================================================
  // REMOVE PRODUCT LINE FROM NEW INVOICE
  // ==========================================================

  const handleRemoveProductLine = (
    index: number
  ) => {

    setFormData(
      (prev) => ({
        ...prev,

        lines:
          prev.lines.filter(
            (_, i) =>
              i !== index
          ),
      })
    );
  };


  // ==========================================================
  // TOTAL INVOICE
  // ==========================================================

  const invoiceTotal = useMemo(() => {

    return formData.lines.reduce(
      (
        total,
        line
      ) =>
        total +
        Number(
          line.total_price || 0
        ),
      0
    );

  }, [formData.lines]);


  // ==========================================================
  // ADD INVOICE
  // ==========================================================

  const handleAddTransaction = () => {

    setDialogMode("add");

    setEditingId(null);

    setFormData(
      createEmptyForm()
    );

    setDialogOpen(true);
  };


  // ==========================================================
  // EDIT SINGLE TRANSACTION LINE
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

      payment_method:
        transaction.payment_method ||
        "Cash",

      status:
        transaction.status ||
        "Prepared",

      notes:
        transaction.notes ||
        "",

      lines: [

        {
          id:
            transaction.id,

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
            Number(
              transaction.qty
            ) || 0,

          price:
            Number(
              transaction.price
            ) || 0,

          total_price:
            Number(
              transaction.total_price
            ) || 0,
        },

      ],
    });

    setDialogOpen(true);
  };


  // ==========================================================
  // DELETE SINGLE LINE
  // ==========================================================

  const handleDeleteTransaction = async (
    id: string
  ) => {

    const confirmed =
      window.confirm(
        "Hapus produk ini dari penjualan?"
      );

    if (!confirmed) {
      return;
    }


    try {

      /*
       * IMPORTANT
       *
       * React TIDAK mengubah products.qty.
       *
       * DELETE akan masuk ke PostgreSQL trigger.
       *
       * Jika status Sent/Received:
       *     stock dikembalikan.
       *
       * Jika Prepared:
       *     stock tidak berubah.
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
          "Product line deleted successfully",
      });

    } catch (err: any) {

      console.error(
        "delete transaction:",
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
  // SAVE NEW MULTI-PRODUCT INVOICE
  // ==========================================================

  const handleSaveNewInvoice = async () => {

    // --------------------------------------------------------
    // Validation
    // --------------------------------------------------------

    if (
      !formData.transaction_number.trim()
    ) {

      toast({
        title: "Error",
        description:
          "Transaction number is required",
        variant: "destructive",
      });

      return;
    }


    if (
      !formData.invoice_number.trim()
    ) {

      toast({
        title: "Error",
        description:
          "Invoice number is required",
        variant: "destructive",
      });

      return;
    }


    if (
      formData.lines.length === 0
    ) {

      toast({
        title: "Error",
        description:
          "Tambahkan minimal satu produk",
        variant: "destructive",
      });

      return;
    }


    // --------------------------------------------------------
    // Validate all lines
    // --------------------------------------------------------

    for (
      const line of formData.lines
    ) {

      if (
        !line.product_id
      ) {

        toast({
          title: "Error",
          description:
            "Ada product yang belum dipilih",
          variant: "destructive",
        });

        return;
      }


      if (
        !line.qty ||
        line.qty <= 0
      ) {

        toast({
          title: "Error",
          description:
            `Qty ${line.product_code} harus lebih dari 0`,
          variant: "destructive",
        });

        return;
      }


      if (
        line.price < 0
      ) {

        toast({
          title: "Error",
          description:
            `Price ${line.product_code} tidak boleh negatif`,
          variant: "destructive",
        });

        return;
      }
    }


    try {

      /*
       * ======================================================
       * MULTI PRODUCT INSERT
       * ======================================================
       *
       * Satu invoice:
       *
       * INV-001
       *     Apel  100
       *     Jeruk 50
       *     Mangga 30
       *
       * disimpan sebagai beberapa row:
       *
       * INV-001 | Apel   | 100
       * INV-001 | Jeruk  | 50
       * INV-001 | Mangga | 30
       *
       * PostgreSQL trigger menangani stock masing-masing row.
       *
       * Tidak ada update products.qty di React.
       */


      const payload = formData.lines.map(
        (line) => ({

          transaction_number:
            formData.transaction_number.trim(),

          customer_name:
            formData.customer_name.trim(),

          invoice_number:
            formData.invoice_number.trim(),

          product_id:
            line.product_id,

          product_name:
            line.product_name,

          product_code:
            line.product_code,

          qty:
            Number(line.qty),

          price:
            Number(line.price),

          total_price:
            Number(line.qty) *
            Number(line.price),

          payment_method:
            formData.payment_method,

          status:
            formData.status,

          notes:
            formData.notes.trim(),

        })
      );


      /*
       * Supabase insert array.
       *
       * Semua row dikirim sebagai satu operasi database.
       *
       * Jika trigger gagal pada salah satu product
       * karena stock tidak cukup, operasi database
       * akan gagal dan tidak menyimpan invoice
       * secara setengah-setengah.
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
          `${formData.lines.length} product berhasil ditambahkan ke invoice ${formData.invoice_number}`,
      });


      setDialogOpen(false);

      setFormData(
        createEmptyForm()
      );

      await fetchTransactions();

      await fetchProducts();

    } catch (err: any) {

      console.error(
        "save invoice:",
        err
      );

      toast({
        title: "Transaction failed",
        description:
          err?.message ||
          "Failed to save invoice",
        variant: "destructive",
      });
    }
  };


  // ==========================================================
  // UPDATE SINGLE LINE
  // ==========================================================

  const handleUpdateLine = async () => {

    if (!editingId) {
      return;
    }


    const line =
      formData.lines[0];

    if (!line) {
      return;
    }


    if (
      !line.product_id
    ) {

      toast({
        title: "Error",
        description:
          "Product is required",
        variant: "destructive",
      });

      return;
    }


    if (
      line.qty <= 0
    ) {

      toast({
        title: "Error",
        description:
          "Qty must be greater than 0",
        variant: "destructive",
      });

      return;
    }


    try {

      /*
       * IMPORTANT:
       *
       * Jangan update products.qty.
       *
       * Trigger akan menghitung selisih.
       *
       * Contoh:
       *
       * Sent 100 → Sent 100
       * = 0
       *
       * Sent 100 → Sent 150
       * = -50
       *
       * Sent 150 → Sent 100
       * = +50
       */

      const payload = {

        transaction_number:
          formData.transaction_number.trim(),

        customer_name:
          formData.customer_name.trim(),

        invoice_number:
          formData.invoice_number.trim(),

        product_id:
          line.product_id,

        product_name:
          line.product_name,

        product_code:
          line.product_code,

        qty:
          Number(line.qty),

        price:
          Number(line.price),

        total_price:
          Number(line.qty) *
          Number(line.price),

        payment_method:
          formData.payment_method,

        status:
          formData.status,

        notes:
          formData.notes.trim(),
      };


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


      setDialogOpen(false);

      setEditingId(null);

      setFormData(
        createEmptyForm()
      );

      await fetchTransactions();

      await fetchProducts();

    } catch (err: any) {

      console.error(
        "update transaction:",
        err
      );

      toast({
        title: "Error",
        description:
          err?.message ||
          "Failed to update transaction",
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


    if (
      dialogMode === "add"
    ) {

      await handleSaveNewInvoice();

      return;
    }


    if (
      dialogMode === "edit"
    ) {

      await handleUpdateLine();

      return;
    }
  };


  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  const formatDate = (
    date:
      | string
      | null
      | undefined
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
  // GROUP TRANSACTIONS BY INVOICE
  // ==========================================================

  const groupedTransactions =
    useMemo(() => {

      const groups =
        new Map<string, any>();


      transactions.forEach(
        (transaction) => {

          /*
           * invoice_number menjadi identitas group.
           *
           * Kalau invoice kosong,
           * gunakan transaction_number.
           */

          const key =
            transaction.invoice_number?.trim() ||
            transaction.transaction_number ||
            transaction.id;


          if (
            !groups.has(key)
          ) {

            groups.set(
              key,
              {
                key,

                invoice_number:
                  transaction.invoice_number ||
                  "-",

                transaction_number:
                  transaction.transaction_number ||
                  "-",

                customer_name:
                  transaction.customer_name ||
                  "-",

                created_at:
                  transaction.created_at,

                payment_method:
                  transaction.payment_method ||
                  "-",

                status:
                  transaction.status ||
                  "-",

                notes:
                  transaction.notes ||
                  "",

                lines: [],

                total_qty: 0,

                total_price: 0,
              }
            );
          }


          const group =
            groups.get(key);


          group.lines.push(
            transaction
          );


          group.total_qty +=
            Number(
              transaction.qty || 0
            );


          group.total_price +=
            Number(
              transaction.total_price ||
              0
            );
        }
      );


      return Array.from(
        groups.values()
      );

    }, [transactions]);


  // ==========================================================
  // PAGINATION
  // ==========================================================

  const rowsPerPage = 10;

  const totalPages =
    Math.ceil(
      groupedTransactions.length /
      rowsPerPage
    ) || 1;


  const paginatedInvoices =
    groupedTransactions.slice(
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

      case "Terkirim":
        return "bg-green-100 text-green-800";

      case "Dalam Pengiriman":
        return "bg-yellow-100 text-yellow-800";

      case "Disiapkan":
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
            Manage sales invoices and inventory
          </p>

        </div>


        <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">

          {/* ADD */}

          <Button
            onClick={
              handleAddTransaction
            }
          >

            <Plus className="mr-2 h-4 w-4" />

            Tambah Penjualan

          </Button>


          {/* EXPORT */}

          <XlsxTable
            data={transactions}
            columns={[

              {
                header:
                  "Transaction No",
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
          placeholder="Search invoice, customer, product..."
          className="w-full"
        />

      </div>


      {/* ====================================================
          ERROR
      ==================================================== */}

      {error && (

        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">

          {error}

        </div>

      )}


      {/* ====================================================
          LOADING
      ==================================================== */}

      {loading && (

        <div className="text-center py-10 text-gray-500">

          Loading...

        </div>

      )}


      {/* ====================================================
          EMPTY
      ==================================================== */}

      {!loading &&
        groupedTransactions.length === 0 && (

          <div className="text-center py-10 text-gray-500">

            No transactions found

          </div>

        )}


      {/* ====================================================
          INVOICE TABLE
      ==================================================== */}

      {!loading &&
        groupedTransactions.length > 0 && (

          <div className="overflow-x-auto">

            <Table>

              <TableHeader>

                <TableRow>

                  <TableCell className="font-semibold">
                    Invoice
                  </TableCell>

                  <TableCell className="font-semibold">
                    Transaction
                  </TableCell>

                  <TableCell className="font-semibold">
                    Customer
                  </TableCell>

                  <TableCell className="font-semibold">
                    Date
                  </TableCell>

                  <TableCell className="font-semibold">
                    Products
                  </TableCell>

                  <TableCell className="text-right font-semibold">
                    Total Qty
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

                </TableRow>

              </TableHeader>


              <TableBody>

                {paginatedInvoices.map(
                  (invoice) => (

                    <TableRow
                      key={
                        invoice.key
                      }
                    >

                      {/* INVOICE */}

                      <TableCell className="font-semibold align-top">

                        {
                          invoice.invoice_number
                        }

                      </TableCell>


                      {/* TRANSACTION */}

                      <TableCell className="align-top">

                        {
                          invoice.transaction_number
                        }

                      </TableCell>


                      {/* CUSTOMER */}

                      <TableCell className="align-top">

                        {
                          invoice.customer_name
                        }

                      </TableCell>


                      {/* DATE */}

                      <TableCell className="align-top">

                        {formatDate(
                          invoice.created_at
                        )}

                      </TableCell>


                      {/* PRODUCTS */}

                      <TableCell>

                        <div className="space-y-1">

                          {invoice.lines.map(
                            (
                              line: any
                            ) => (

                              <div
                                key={
                                  line.id
                                }
                                className="flex items-center gap-3"
                              >

                                <div className="min-w-0">

                                  <div className="font-medium">

                                    {
                                      line.product_name
                                    }

                                  </div>

                                  <div className="text-xs text-gray-500">

                                    {
                                      line.product_code
                                    }

                                    {" × "}

                                    {
                                      Number(
                                        line.qty
                                      ).toLocaleString(
                                        "id-ID"
                                      )
                                    }

                                  </div>

                                </div>


                                {/* EDIT */}

                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() =>
                                    handleEditTransaction(
                                      line
                                    )
                                  }
                                >

                                  <Edit3 className="h-3.5 w-3.5" />

                                </Button>


                                {/* DELETE */}

                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() =>
                                    handleDeleteTransaction(
                                      line.id
                                    )
                                  }
                                >

                                  <Trash2 className="h-3.5 w-3.5" />

                                </Button>

                              </div>

                            )
                          )}

                        </div>

                      </TableCell>


                      {/* TOTAL QTY */}

                      <TableCell className="text-right align-top font-semibold">

                        {Number(
                          invoice.total_qty
                        ).toLocaleString(
                          "id-ID"
                        )}

                      </TableCell>


                      {/* TOTAL PRICE */}

                      <TableCell className="text-right align-top font-semibold">

                        Rp{" "}

                        {Number(
                          invoice.total_price
                        ).toLocaleString(
                          "id-ID"
                        )}

                      </TableCell>


                      {/* PAYMENT */}

                      <TableCell className="align-top">

                        <span
                          className={`px-2 py-1 rounded text-xs ${getPaymentClass(
                            invoice.payment_method
                          )}`}
                        >

                          {
                            invoice.payment_method
                          }

                        </span>

                      </TableCell>


                      {/* STATUS */}

                      <TableCell className="align-top">

                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(
                            invoice.status
                          )}`}
                        >

                          {
                            invoice.status
                          }

                        </span>

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
        groupedTransactions.length > 0 && (

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


      {/* ====================================================
          ADD / EDIT DIALOG
      ==================================================== */}

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
                ? "Tambah Penjualan"
                : "Edit Produk Penjualan"}

            </DialogTitle>

            <DialogDescription>

              {dialogMode === "add"
                ? "Tambahkan beberapa produk dalam satu invoice."
                : "Edit detail produk penjualan."}

            </DialogDescription>

          </DialogHeader>


          <form
            onSubmit={
              handleSubmit
            }
            className="space-y-5"
          >

            {/* =================================================
                HEADER INVOICE
            ================================================= */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* TRANSACTION */}

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


              {/* CUSTOMER */}

              <div>

                <label className="block text-sm font-medium mb-1">

                  Customer

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


              {/* INVOICE */}

              <div>

                <label className="block text-sm font-medium mb-1">

                  Invoice *

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
                  placeholder="INV-001"
                  required
                />

              </div>

            </div>


            {/* =================================================
                PAYMENT + STATUS
            ================================================= */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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

                  <SelectTrigger>

                    <SelectValue />

                  </SelectTrigger>


                  <SelectContent>

                    <SelectItem value="Disiapkan">
                      Prepared
                    </SelectItem>

                    <SelectItem value="Dalam Pengiriman">
                      Sent
                    </SelectItem>

                    <SelectItem value="Terkirim">
                      Received
                    </SelectItem>

                  </SelectContent>

                </Select>

              </div>

            </div>


            {/* =================================================
                ADD PRODUCT
            ================================================= */}

            {dialogMode === "add" && (

              <div className="border rounded-lg p-4 space-y-3">

                <div>

                  <label className="block text-sm font-medium mb-1">

                    Tambah Product

                  </label>

                  <Select
                    value=""
                    onValueChange={
                      handleAddProductLine
                    }
                    disabled={
                      productsLoading
                    }
                  >

                    <SelectTrigger>

                      <SelectValue
                        placeholder={
                          productsLoading
                            ? "Loading products..."
                            : "Pilih product untuk invoice"
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

                            {
                              product.description
                            }

                            {" | Stock: "}

                            {Number(
                              product.qty ||
                              0
                            ).toLocaleString(
                              "id-ID"
                            )}

                          </SelectItem>

                        )
                      )}

                    </SelectContent>

                  </Select>

                </div>


                {/* =================================================
                    PRODUCT LINES
                ================================================= */}

                {formData.lines.length === 0 && (

                  <div className="text-center py-6 text-sm text-gray-500">

                    Belum ada product.
                    Pilih product di atas.

                  </div>

                )}


                {formData.lines.length > 0 && (

                  <div className="border rounded-lg overflow-x-auto">

                    <Table>

                      <TableHeader>

                        <TableRow>

                          <TableCell>
                            Product
                          </TableCell>

                          <TableCell>
                            Code
                          </TableCell>

                          <TableCell className="w-28">
                            Qty
                          </TableCell>

                          <TableCell className="w-40">
                            Price
                          </TableCell>

                          <TableCell className="text-right">
                            Total
                          </TableCell>

                          <TableCell className="w-12">
                          </TableCell>

                        </TableRow>

                      </TableHeader>


                      <TableBody>

                        {formData.lines.map(
                          (
                            line,
                            index
                          ) => (

                            <TableRow
                              key={
                                line.product_id
                              }
                            >

                              <TableCell>

                                <div className="font-medium">

                                  {
                                    line.product_name
                                  }

                                </div>

                              </TableCell>


                              <TableCell>

                                {
                                  line.product_code
                                }

                              </TableCell>


                              {/* QTY */}

                              <TableCell>

                                <Input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={
                                    line.qty
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    handleLineQtyChange(
                                      index,
                                      e.target.value
                                    )
                                  }
                                />

                              </TableCell>


                              {/* PRICE */}

                              <TableCell>

                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={
                                    line.price
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    handleLinePriceChange(
                                      index,
                                      e.target.value
                                    )
                                  }
                                />

                              </TableCell>


                              {/* TOTAL */}

                              <TableCell className="text-right font-medium">

                                Rp{" "}

                                {Number(
                                  line.total_price
                                ).toLocaleString(
                                  "id-ID"
                                )}

                              </TableCell>


                              {/* REMOVE */}

                              <TableCell>

                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() =>
                                    handleRemoveProductLine(
                                      index
                                    )
                                  }
                                >

                                  <X className="h-4 w-4" />

                                </Button>

                              </TableCell>

                            </TableRow>

                          )
                        )}

                      </TableBody>

                    </Table>

                  </div>

                )}

              </div>

            )}


            {/* =================================================
                EDIT MODE
            ================================================= */}

            {dialogMode === "edit" && (

              <div className="border rounded-lg p-4">

                {formData.lines.map(
                  (
                    line,
                    index
                  ) => (

                    <div
                      key={
                        line.id ||
                        line.product_id
                      }
                      className="grid grid-cols-1 md:grid-cols-3 gap-4"
                    >

                      <div>

                        <label className="block text-sm font-medium mb-1">

                          Product

                        </label>

                        <Input
                          value={
                            `${line.product_code} - ${line.product_name}`
                          }
                          disabled
                        />

                      </div>


                      <div>

                        <label className="block text-sm font-medium mb-1">

                          Qty

                        </label>

                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={
                            line.qty
                          }
                          onChange={(
                            e
                          ) =>
                            handleLineQtyChange(
                              index,
                              e.target.value
                            )
                          }
                        />

                      </div>


                      <div>

                        <label className="block text-sm font-medium mb-1">

                          Price

                        </label>

                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={
                            line.price
                          }
                          onChange={(
                            e
                          ) =>
                            handleLinePriceChange(
                              index,
                              e.target.value
                            )
                          }
                        />

                      </div>

                    </div>

                  )
                )}

              </div>

            )}


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
                INVOICE TOTAL
            ================================================= */}

            <div className="border rounded-lg p-4 bg-gray-50">

              <div className="flex justify-between items-center">

                <div>

                  <div className="text-sm text-gray-500">

                    Total Product

                  </div>

                  <div className="font-semibold">

                    {formData.lines.length}

                    {" product"}

                  </div>

                </div>


                <div className="text-right">

                  <div className="text-sm text-gray-500">

                    Total Invoice

                  </div>

                  <div className="text-xl font-bold">

                    Rp{" "}

                    {Number(
                      invoiceTotal
                    ).toLocaleString(
                      "id-ID"
                    )}

                  </div>

                </div>

              </div>

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
              >

                Cancel

              </Button>


              <Button
                type="submit"
              >

                {dialogMode === "add"
                  ? "Simpan Invoice"
                  : "Update Product"}

              </Button>

            </div>

          </form>

        </DialogContent>

      </Dialog>

    </div>
  );
};


export default Penjualan;
