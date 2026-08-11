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


// ============================================================
// STATUS
// ============================================================

const STATUS_MENUNGGU = "Menunggu Konfirmasi";

const STATUS_DITERIMA = "Barang Diterima";

const STATUS_TIDAK_DITERIMA = "Tidak Diterima";


// ============================================================
// COMPONENT
// ============================================================

const BarangMasuk = () => {

  const [transactions, setTransactions] =
    useState<BarangMasukItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [dialogOpen, setDialogOpen] =
    useState(false);

  const [dialogMode, setDialogMode] =
    useState<"add" | "edit">("add");

  const [page, setPage] =
    useState(1);

  const [products, setProducts] =
    useState<any[]>([]);

  const [editingId, setEditingId] =
    useState<string | null>(null);


  const { toast } = useToast();


  // ============================================================
  // FORM DATA
  // ============================================================

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

    status: STATUS_MENUNGGU,

    notes: "",
  });


  // ============================================================
  // FETCH BARANG MASUK
  // ============================================================

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


      const {
        data,
        error,
      } = await query;


      if (error) {
        throw error;
      }


      setTransactions(data || []);

      setError(null);

    } catch (err: any) {

      console.error(err);

      setError(
        err?.message ||
        "Failed to load transactions"
      );

      setTransactions([]);

    } finally {

      setLoading(false);

    }

  };


  useEffect(() => {

    fetchTransactions();

  }, [searchTerm]);


  // ============================================================
  // FETCH PRODUCTS
  // ============================================================

  useEffect(() => {

    const fetchProducts = async () => {

      try {

        const {
          data,
          error,
        } = await supabase
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
          "Failed to load products:",
          err
        );

      }

    };


    fetchProducts();

  }, []);


  // ============================================================
  // PRODUCT CHANGE
  // ============================================================

  const handleProductChange = (
    productId: string
  ) => {

    const product =
      products.find(
        (prod) =>
          prod.id === productId
      );


    if (product) {

      setFormData((prev) => ({

        ...prev,

        product_id:
          productId,

        product_name:
          product.description || "",

        product_code:
          product.code || "",

        price:
          Number(product.price || 0),

        total_price:
          Number(prev.qty || 0) *
          Number(product.price || 0),

      }));

    } else {

      setFormData((prev) => ({

        ...prev,

        product_id:
          productId,

      }));

    }

  };


  // ============================================================
  // QTY CHANGE
  // ============================================================

  const handleQtyChange = (
    qty: number
  ) => {

    setFormData((prev) => ({

      ...prev,

      qty,

      total_price:
        qty *
        Number(prev.price || 0),

    }));

  };


  // ============================================================
  // PRICE CHANGE
  // ============================================================

  const handlePriceChange = (
    price: number
  ) => {

    setFormData((prev) => ({

      ...prev,

      price,

      total_price:
        Number(prev.qty || 0) *
        price,

    }));

  };


  // ============================================================
  // ADD TRANSACTION
  // ============================================================

  const handleAddTransaction = () => {

    setDialogMode("add");

    setEditingId(null);


    setFormData({

      transaction_number:
        "BM-",

      supplier_name:
        "",

      invoice_number:
        "",

      product_id:
        "",

      product_name:
        "",

      product_code:
        "",

      qty:
        0,

      price:
        0,

      total_price:
        0,

      status:
        STATUS_MENUNGGU,

      notes:
        "",

    });


    setDialogOpen(true);

  };


  // ============================================================
  // EDIT TRANSACTION
  // ============================================================

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

      qty:
        Number(transaction.qty || 0),

      price:
        Number(transaction.price || 0),

      total_price:
        Number(transaction.total_price || 0),

      status:
        transaction.status ||
        STATUS_MENUNGGU,

      notes:
        transaction.notes || "",

    });


    setEditingId(
      transaction.id
    );

    setDialogOpen(true);

  };


  // ============================================================
  // STATUS HELPER
  // ============================================================

  const isReceived = (
    status: string
  ) => {

    return (
      status ===
      STATUS_DITERIMA
    );

  };


  // ============================================================
  // DELETE TRANSACTION
  //
  // PENTING:
  // React TIDAK mengubah products.qty.
  //
  // Supabase trigger yang akan mengurangi stok
  // jika transaksi yang dihapus berstatus Barang Diterima.
  // ============================================================

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

      // --------------------------------------------------------
      // AMBIL TRANSAKSI
      // --------------------------------------------------------

      const {
        data: transaction,
        error: fetchError,
      } = await supabase

        .from("barang_masuk")

        .select("*")

        .eq("id", id)

        .single();


      if (fetchError) {
        throw fetchError;
      }


      // --------------------------------------------------------
      // DELETE
      //
      // JANGAN UPDATE products.qty DI SINI.
      //
      // Supabase trigger akan menangani stok.
      // --------------------------------------------------------

      const {
        error: deleteError,
      } = await supabase

        .from("barang_masuk")

        .delete()

        .eq("id", id);


      if (deleteError) {
        throw deleteError;
      }


      // --------------------------------------------------------
      // REFRESH TRANSACTIONS
      // --------------------------------------------------------

      await fetchTransactions();


      // --------------------------------------------------------
      // REFRESH PRODUCTS
      // --------------------------------------------------------

      const {
        data: refreshedProducts,
        error: productError,
      } = await supabase

        .from("products")

        .select("*")

        .order("description", {
          ascending: true,
        });


      if (!productError) {

        setProducts(
          refreshedProducts || []
        );

      }


      toast({

        title:
          "Success",

        description:
          isReceived(
            transaction?.status
          )
            ? "Transaction deleted. Received stock was restored by Supabase."
            : "Transaction deleted successfully.",

      });


    } catch (err: any) {

      console.error(err);


      toast({

        title:
          "Error",

        description:
          err?.message ||
          "Failed to delete transaction",

        variant:
          "destructive",

      });

    }

  };


  // ============================================================
  // SUBMIT TRANSACTION
  // ============================================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();


    try {

      // ========================================================
      // VALIDATION
      // ========================================================

      if (
        !formData.transaction_number ||
        formData.transaction_number ===
          "BM-"
      ) {

        toast({

          title:
            "Error",

          description:
            "Please enter the transaction number after BM-",

          variant:
            "destructive",

        });

        return;

      }


      if (!formData.product_id) {

        toast({

          title:
            "Error",

          description:
            "Please select a product",

          variant:
            "destructive",

        });

        return;

      }


      if (
        Number(formData.qty || 0) <= 0
      ) {

        toast({

          title:
            "Error",

          description:
            "Quantity must be greater than 0",

          variant:
            "destructive",

        });

        return;

      }


      // ========================================================
      // PAYLOAD
      // ========================================================

      const payload = {

        ...formData,

        qty:
          Number(formData.qty || 0),

        price:
          Number(formData.price || 0),

        total_price:
          Number(formData.qty || 0) *
          Number(formData.price || 0),

      };


      // ========================================================
      // ADD
      // ========================================================

      if (
        dialogMode === "add"
      ) {

        const {
          error: insertError,
        } = await supabase

          .from("barang_masuk")

          .insert(payload);


        if (insertError) {
          throw insertError;
        }


        // ======================================================
        // PENTING:
        //
        // TIDAK ADA updateProductStock() DI SINI.
        //
        // Supabase trigger:
        //
        // INSERT barang_masuk
        //       ↓
        // sync_barang_masuk_stock()
        //       ↓
        // products.qty
        //
        // ======================================================


        toast({

          title:
            "Success",

          description:
            isReceived(
              formData.status
            )
              ? `Transaction added. Stock increased by ${formData.qty}.`
              : "Transaction added. Stock was not changed because the item has not been received.",

        });

      }


      // ========================================================
      // EDIT
      // ========================================================

      else if (
        editingId
      ) {

        // ------------------------------------------------------
        // UPDATE TRANSACTION SAJA
        // ------------------------------------------------------

        const {
          error: updateError,
        } = await supabase

          .from("barang_masuk")

          .update(payload)

          .eq(
            "id",
            editingId
          );


        if (updateError) {
          throw updateError;
        }


        // ======================================================
        // PENTING:
        //
        // TIDAK ADA LOGIKA UPDATE PRODUCTS.QTY DI REACT.
        //
        // Semua perubahan stok ditangani Supabase trigger.
        //
        // ======================================================


        toast({

          title:
            "Success",

          description:
            "Transaction updated successfully.",

        });

      }


      // ========================================================
      // CLOSE DIALOG
      // ========================================================

      setDialogOpen(false);

      setEditingId(null);


      // ========================================================
      // REFRESH TRANSACTIONS
      // ========================================================

      await fetchTransactions();


      // ========================================================
      // REFRESH PRODUCTS
      // ========================================================

      const {
        data: refreshedProducts,
        error: refreshedProductError,
      } = await supabase

        .from("products")

        .select("*")

        .order("description", {
          ascending: true,
        });


      if (!refreshedProductError) {

        setProducts(
          refreshedProducts || []
        );

      }


    } catch (err: any) {

      console.error(err);


      toast({

        title:
          "Error",

        description:
          err?.message ||
          "Failed to save transaction",

        variant:
          "destructive",

      });

    }

  };


  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (
    date:
      string |
      null |
      undefined
  ) => {

    if (!date) {
      return "-";
    }


    return new Date(
      date
    ).toLocaleDateString(
      "id-ID",
      {

        day:
          "2-digit",

        month:
          "2-digit",

        year:
          "numeric",

      }
    );

  };


  // ============================================================
  // PAGINATION
  // ============================================================

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


  // ============================================================
  // RETURN
  // ============================================================

  return (

    <div className="space-y-6">

      {/* ======================================================
          HEADER
      ====================================================== */}

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

            <Plus
              className="mr-2 h-4 w-4"
            />

            Add Barang Masuk

          </Button>


          <XlsxTable

            data={
              transactions
            }

            columns={[

              {
                header:
                  "Tanggal",

                key:
                  "created_at",
              },

              {
                header:
                  "Nomor Transaksi",

                key:
                  "transaction_number",
              },

              {
                header:
                  "Supplier",

                key:
                  "supplier_name",
              },

              {
                header:
                  "Invoice",

                key:
                  "invoice_number",
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
                  "Total Price",

                key:
                  "total_price",
              },

              {
                header:
                  "Status",

                key:
                  "status",
              },

            ]}

            filename=
              "barang_masuk.xlsx"

            className=
              "flex items-center"

          >

            <Button

              variant="outline"

              size="sm"

              className="px-3"

            >

              <Download
                className="mr-2 h-4 w-4"
              />

              Export

            </Button>

          </XlsxTable>

        </div>

      </div>


      {/* ======================================================
          SEARCH
      ====================================================== */}

      <div className="w-full max-w-sm">

        <Search

          value={
            searchTerm
          }

          onChange={(e) => {

            setSearchTerm(
              e.target.value
            );

            setPage(1);

          }}

          placeholder=
            "Search transaction..."

          className="w-full"

        />

      </div>


      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (

        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">

          <p>
            {error}
          </p>

        </div>

      )}


      {/* ======================================================
          LOADING
      ====================================================== */}

      {loading && (

        <div className="text-center py-10 text-gray-500">

          Loading transactions...

        </div>

      )}


      {/* ======================================================
          EMPTY
      ====================================================== */}

      {!loading &&
        transactions.length === 0 && (

          <div className="text-center py-10 text-gray-500">

            No transactions found

          </div>

        )}


      {/* ======================================================
          TABLE
      ====================================================== */}

      {!loading &&
        transactions.length > 0 && (

          <Table>

            <TableHeader>

              <TableRow>

                <TableCell
                  className="font-semibold"
                >
                  Tanggal
                </TableCell>

                <TableCell
                  className="font-semibold"
                >
                  Transaction No
                </TableCell>

                <TableCell
                  className="font-semibold"
                >
                  Supplier
                </TableCell>

                <TableCell
                  className="font-semibold"
                >
                  Invoice No
                </TableCell>

                <TableCell
                  className="font-semibold"
                >
                  Product Name
                </TableCell>

                <TableCell
                  className="font-semibold"
                >
                  Code
                </TableCell>

                <TableCell
                  className="text-right font-semibold"
                >
                  Qty
                </TableCell>

                <TableCell
                  className="text-right font-semibold"
                >
                  Total Price
                </TableCell>

                <TableCell
                  className="font-semibold"
                >
                  Status
                </TableCell>

                <TableCell
                  className="text-center font-semibold"
                >
                  Actions
                </TableCell>

              </TableRow>

            </TableHeader>


            <TableBody>

              {paginatedTransactions.map(
                (t) => (

                  <TableRow
                    key={t.id}
                  >

                    <TableCell>

                      {formatDate(
                        t.created_at
                      )}

                    </TableCell>


                    <TableCell
                      className="font-medium"
                    >

                      {
                        t.transaction_number
                      }

                    </TableCell>


                    <TableCell>

                      {
                        t.supplier_name ||
                        "-"
                      }

                    </TableCell>


                    <TableCell>

                      {
                        t.invoice_number ||
                        "-"
                      }

                    </TableCell>


                    <TableCell>

                      {
                        t.product_name ||
                        "-"
                      }

                    </TableCell>


                    <TableCell>

                      {
                        t.product_code ||
                        "-"
                      }

                    </TableCell>


                    <TableCell
                      className="text-right"
                    >

                      {Number(
                        t.qty || 0
                      ).toLocaleString()}

                    </TableCell>


                    <TableCell
                      className="text-right"
                    >

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
                          STATUS_DITERIMA

                            ? "bg-green-100 text-green-800"

                            : t.status ===
                              STATUS_TIDAK_DITERIMA

                            ? "bg-red-100 text-red-800"

                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >

                        {
                          t.status
                        }

                      </span>

                    </TableCell>


                    <TableCell
                      className="flex justify-center space-x-2"
                    >

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

                        <Edit3
                          className="h-4 w-4"
                        />

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

                        <Trash2
                          className="h-4 w-4"
                        />

                      </Button>

                    </TableCell>

                  </TableRow>

                )
              )}

            </TableBody>

          </Table>

        )}


      {/* ======================================================
          PAGINATION
      ====================================================== */}

      {!loading &&
        transactions.length > 0 && (

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


      {/* ======================================================
          DIALOG
      ====================================================== */}

      <Dialog

        open={
          dialogOpen
        }

        onOpenChange={
          setDialogOpen
        }

      >

        <DialogContent
          className="w-full max-w-lg"
        >

          <DialogHeader>

            <DialogTitle>

              {
                dialogMode ===
                "add"

                  ? "Add Barang Masuk"

                  : "Edit Barang Masuk"
              }

            </DialogTitle>


            <DialogDescription>

              Fill in transaction
              details below

            </DialogDescription>

          </DialogHeader>


          <form

            onSubmit={
              handleSubmit
            }

            className="space-y-4"

          >

            {/* ==================================================
                TRANSACTION + INVOICE
            ================================================== */}

            <div
              className="grid grid-cols-2 gap-4"
            >

              <div>

                <label
                  className="block text-sm font-medium mb-1"
                >

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

                <label
                  className="block text-sm font-medium mb-1"
                >

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

                  placeholder=
                    "Invoice number"

                />

              </div>

            </div>


            {/* ==================================================
                SUPPLIER
            ================================================== */}

            <div>

              <label
                className="block text-sm font-medium mb-1"
              >

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

                placeholder=
                  "Supplier name"

              />

            </div>


            {/* ==================================================
                PRODUCT
            ================================================== */}

            <div>

              <label
                className="block text-sm font-medium mb-1"
              >

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

                <SelectTrigger
                  className="w-full"
                >

                  <SelectValue
                    placeholder=
                      "Choose a product"
                  />

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

                        {
                          p.code
                        }

                        {" - "}

                        {
                          p.description
                        }

                        {" (Stock: "}

                        {
                          Number(
                            p.qty || 0
                          ).toLocaleString()
                        }

                        {")"}

                      </SelectItem>

                    )
                  )}

                </SelectContent>

              </Select>

            </div>


            {/* ==================================================
                QTY / PRICE / TOTAL
            ================================================== */}

            <div
              className="grid grid-cols-3 gap-4"
            >

              <div>

                <label
                  className="block text-sm font-medium mb-1"
                >

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

                <label
                  className="block text-sm font-medium mb-1"
                >

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

                <label
                  className="block text-sm font-medium mb-1"
                >

                  Total Price

                </label>


                <Input

                  type="number"

                  value={
                    formData.total_price
                  }

                  disabled

                  className=
                    "bg-gray-100"

                />

              </div>

            </div>


            {/* ==================================================
                STATUS
            ================================================== */}

            <div>

              <label
                className="block text-sm font-medium mb-1"
              >

                Status

              </label>


              <Select

                value={
                  formData.status
                }

                onValueChange={(val) =>
                  setFormData({

                    ...formData,

                    status:
                      val,

                  })
                }

              >

                <SelectTrigger
                  className="w-full"
                >

                  <SelectValue
                    placeholder=
                      "Status"
                  />

                </SelectTrigger>


                <SelectContent>

                  <SelectItem
                    value={
                      STATUS_MENUNGGU
                    }
                  >

                    Menunggu Konfirmasi

                  </SelectItem>


                  <SelectItem
                    value={
                      STATUS_DITERIMA
                    }
                  >

                    Barang Diterima

                  </SelectItem>


                  <SelectItem
                    value={
                      STATUS_TIDAK_DITERIMA
                    }
                  >

                    Tidak Diterima

                  </SelectItem>

                </SelectContent>

              </Select>

            </div>


            {/* ==================================================
                BUTTON
            ================================================== */}

            <div
              className="flex justify-end space-x-3 pt-4"
            >

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

                {
                  dialogMode ===
                  "add"

                    ? "Add Transaction"

                    : "Update Transaction"
                }

              </Button>

            </div>

          </form>

        </DialogContent>

      </Dialog>

    </div>

  );

};


export default BarangMasuk;
