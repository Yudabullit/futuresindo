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
// STATUS
// ============================================================

const STATUS_MENUNGGU =
  "Menunggu Konfirmasi";

const STATUS_DITERIMA =
  "Barang Diterima";

const STATUS_TIDAK_DITERIMA =
  "Tidak Diterima";


// ============================================================
// TYPES
// ============================================================

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


interface ProductLine {
  tempId: string;

  product_id: string;

  product_name: string;

  product_code: string;

  qty: number;

  price: number;

  total_price: number;
}


interface InvoiceGroup {
  groupKey: string;

  transaction_number: string;

  invoice_number: string;

  supplier_name: string;

  created_at?: string;

  status: string;

  items: BarangMasukItem[];

  total_qty: number;

  total_price: number;
}


// ============================================================
// COMPONENT
// ============================================================

const BarangMasuk = () => {

  // ==========================================================
  // DATA
  // ==========================================================

  const [
    transactions,
    setTransactions,
  ] = useState<BarangMasukItem[]>([]);


  const [
    products,
    setProducts,
  ] = useState<any[]>([]);


  // ==========================================================
  // UI
  // ==========================================================

  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );


  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");


  const [
    page,
    setPage,
  ] = useState(1);


  const [
    dialogOpen,
    setDialogOpen,
  ] = useState(false);


  const [
    dialogMode,
    setDialogMode,
  ] = useState<
    "add" | "edit"
  >("add");


  const [
    editingId,
    setEditingId,
  ] = useState<string | null>(
    null
  );


  const { toast } =
    useToast();


  // ==========================================================
  // INVOICE HEADER FORM
  // ==========================================================

  const [
    transactionNumber,
    setTransactionNumber,
  ] = useState("BM-");


  const [
    supplierName,
    setSupplierName,
  ] = useState("");


  const [
    invoiceNumber,
    setInvoiceNumber,
  ] = useState("");


  const [
    status,
    setStatus,
  ] = useState(
    STATUS_MENUNGGU
  );


  const [
    notes,
    setNotes,
  ] = useState("");


  // ==========================================================
  // PRODUCT LINES
  // ==========================================================

  const [
    productLines,
    setProductLines,
  ] = useState<ProductLine[]>(
    []
  );


  // ==========================================================
  // FETCH TRANSACTIONS
  // ==========================================================

  const fetchTransactions =
    async () => {

      try {

        setLoading(true);

        let query = supabase
          .from("barang_masuk")
          .select("*")
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          );


        if (
          searchTerm.trim()
        ) {

          const term =
            searchTerm.trim();


          query = query.or(
            `transaction_number.ilike.%${term}%,supplier_name.ilike.%${term}%,invoice_number.ilike.%${term}%,product_name.ilike.%${term}%,product_code.ilike.%${term}%`
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
          (data ||
            []) as BarangMasukItem[]
        );


        setError(null);

      } catch (
        err: any
      ) {

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


  // ==========================================================
  // FETCH PRODUCTS
  // ==========================================================

  const fetchProducts =
    async () => {

      try {

        const {
          data,
          error,
        } = await supabase
          .from("products")
          .select("*")
          .order(
            "description",
            {
              ascending:
                true,
            }
          );


        if (error) {
          throw error;
        }


        setProducts(
          data || []
        );

      } catch (
        err: any
      ) {

        console.error(
          "Failed to load products:",
          err
        );

      }

    };


  useEffect(() => {

    fetchProducts();

  }, []);


  // ==========================================================
  // GROUP TRANSACTIONS BY INVOICE
  // ==========================================================

  const invoiceGroups =
    useMemo(() => {

      const map =
        new Map<
          string,
          InvoiceGroup
        >();


      for (
        const item of transactions
      ) {

        const invoice =
          (
            item.invoice_number ||
            ""
          ).trim();


        const groupKey =
          invoice ||
          item.transaction_number;


        if (
          !map.has(groupKey)
        ) {

          map.set(
            groupKey,
            {

              groupKey,

              transaction_number:
                item.transaction_number,

              invoice_number:
                invoice,

              supplier_name:
                item.supplier_name ||
                "",

              created_at:
                item.created_at,

              status:
                item.status,

              items: [],

              total_qty:
                0,

              total_price:
                0,

            }
          );

        }


        const group =
          map.get(groupKey)!;


        group.items.push(
          item
        );


        group.total_qty +=
          Number(
            item.qty || 0
          );


        group.total_price +=
          Number(
            item.total_price ||
              0
          );

      }


      return Array.from(
        map.values()
      );

    }, [transactions]);


  // ==========================================================
  // FILTER GROUPS
  // ==========================================================

  const filteredGroups =
    useMemo(() => {

      if (
        !searchTerm.trim()
      ) {

        return invoiceGroups;

      }


      const term =
        searchTerm
          .trim()
          .toLowerCase();


      return invoiceGroups.filter(
        (group) => {

          const headerMatch =

            group.invoice_number
              .toLowerCase()
              .includes(term) ||

            group.transaction_number
              .toLowerCase()
              .includes(term) ||

            group.supplier_name
              .toLowerCase()
              .includes(term);


          const productMatch =
            group.items.some(
              (item) =>

                (
                  item.product_name ||
                  ""
                )
                  .toLowerCase()
                  .includes(term) ||

                (
                  item.product_code ||
                  ""
                )
                  .toLowerCase()
                  .includes(term)
            );


          return (
            headerMatch ||
            productMatch
          );

        }
      );

    }, [
      invoiceGroups,
      searchTerm,
    ]);


  // ==========================================================
  // PAGINATION
  // ==========================================================

  const rowsPerPage = 10;


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredGroups.length /
          rowsPerPage
      )
    );


  const paginatedGroups =
    filteredGroups.slice(
      (page - 1) *
        rowsPerPage,

      page *
        rowsPerPage
    );


  // ==========================================================
  // RESET FORM
  // ==========================================================

  const resetForm =
    () => {

      setTransactionNumber(
        "BM-"
      );

      setSupplierName("");

      setInvoiceNumber("");

      setStatus(
        STATUS_MENUNGGU
      );

      setNotes("");

      setProductLines([]);

      setEditingId(null);

    };


  // ==========================================================
  // OPEN ADD
  // ==========================================================

  const handleAddTransaction =
    () => {

      setDialogMode("add");

      resetForm();

      setDialogOpen(true);

    };


  // ==========================================================
  // ADD PRODUCT LINE
  // ==========================================================

  const addProductLine =
    () => {

      const newLine:
        ProductLine = {

        tempId:
          `${Date.now()}-${Math.random()}`,

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

      };


      setProductLines(
        (prev) => [
          ...prev,
          newLine,
        ]
      );

    };


  // ==========================================================
  // REMOVE PRODUCT LINE
  // ==========================================================

  const removeProductLine =
    (
      tempId: string
    ) => {

      setProductLines(
        (prev) =>
          prev.filter(
            (line) =>
              line.tempId !==
              tempId
          )
      );

    };


  // ==========================================================
  // CHANGE PRODUCT
  // ==========================================================

  const changeProductLine =
    (
      tempId: string,
      productId: string
    ) => {

      const product =
        products.find(
          (p) =>
            p.id ===
            productId
        );


      setProductLines(
        (prev) =>
          prev.map(
            (line) => {

              if (
                line.tempId !==
                tempId
              ) {

                return line;

              }


              const price =
                Number(
                  product?.price ||
                    0
                );


              return {

                ...line,

                product_id:
                  productId,

                product_name:
                  product?.description ||
                  "",

                product_code:
                  product?.code ||
                  "",

                price,

                total_price:
                  Number(
                    line.qty || 0
                  ) * price,

              };

            }
          )
      );

    };


  // ==========================================================
  // CHANGE QTY
  // ==========================================================

  const changeProductQty =
    (
      tempId: string,
      qty: number
    ) => {

      setProductLines(
        (prev) =>
          prev.map(
            (line) => {

              if (
                line.tempId !==
                tempId
              ) {

                return line;

              }


              const safeQty =
                Math.max(
                  0,
                  Number(
                    qty || 0
                  )
                );


              return {

                ...line,

                qty:
                  safeQty,

                total_price:
                  safeQty *
                  Number(
                    line.price || 0
                  ),

              };

            }
          )
      );

    };


  // ==========================================================
  // CHANGE PRICE
  // ==========================================================

  const changeProductPrice =
    (
      tempId: string,
      price: number
    ) => {

      setProductLines(
        (prev) =>
          prev.map(
            (line) => {

              if (
                line.tempId !==
                tempId
              ) {

                return line;

              }


              const safePrice =
                Math.max(
                  0,
                  Number(
                    price || 0
                  )
                );


              return {

                ...line,

                price:
                  safePrice,

                total_price:
                  Number(
                    line.qty || 0
                  ) *
                  safePrice,

              };

            }
          )
      );

    };


  // ==========================================================
  // TOTAL INVOICE
  // ==========================================================

  const invoiceTotalQty =
    productLines.reduce(
      (
        total,
        line
      ) =>
        total +
        Number(
          line.qty || 0
        ),
      0
    );


  const invoiceTotalPrice =
    productLines.reduce(
      (
        total,
        line
      ) =>
        total +
        Number(
          line.total_price ||
            0
        ),
      0
    );


  // ==========================================================
  // EDIT SINGLE ITEM
  //
  // Untuk keamanan stok:
  // edit tetap dilakukan pada SATU row barang_masuk.
  //
  // Supabase trigger yang mengatur products.qty.
  // ==========================================================

  const handleEditTransaction =
    (
      transaction: BarangMasukItem
    ) => {

      setDialogMode("edit");

      setEditingId(
        transaction.id
      );


      setTransactionNumber(
        transaction.transaction_number
      );


      setSupplierName(
        transaction.supplier_name ||
          ""
      );


      setInvoiceNumber(
        transaction.invoice_number ||
          ""
      );


      setStatus(
        transaction.status ||
          STATUS_MENUNGGU
      );


      setNotes(
        transaction.notes ||
          ""
      );


      setProductLines([

        {

          tempId:
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
              transaction.qty ||
                0
            ),

          price:
            Number(
              transaction.price ||
                0
            ),

          total_price:
            Number(
              transaction.total_price ||
                0
            ),

        },

      ]);


      setDialogOpen(true);

    };


  // ==========================================================
  // DELETE SINGLE ITEM
  //
  // Jangan update products.qty di React.
  // DELETE akan memicu Supabase trigger.
  // ==========================================================

  const handleDeleteTransaction =
    async (
      id: string
    ) => {

      if (
        !window.confirm(
          "Delete this product line?"
        )
      ) {

        return;

      }


      try {

        const {
          error,
        } = await supabase
          .from("barang_masuk")
          .delete()
          .eq(
            "id",
            id
          );


        if (error) {
          throw error;
        }


        await fetchTransactions();

        await fetchProducts();


        toast({

          title:
            "Success",

          description:
            "Product line deleted successfully.",

        });

      } catch (
        err: any
      ) {

        console.error(err);


        toast({

          title:
            "Error",

          description:
            err?.message ||
            "Failed to delete product line",

          variant:
            "destructive",

        });

      }

    };


  // ==========================================================
  // VALIDATE PRODUCT LINES
  // ==========================================================

  const validateProductLines =
    () => {

      if (
        productLines.length ===
        0
      ) {

        return "Add at least one product.";

      }


      const productIds =
        new Set<string>();


      for (
        const line of productLines
      ) {

        if (
          !line.product_id
        ) {

          return "Please select a product for every row.";

        }


        if (
          Number(
            line.qty || 0
          ) <= 0
        ) {

          return "Every product quantity must be greater than 0.";

        }


        if (
          productIds.has(
            line.product_id
          )
        ) {

          return "The same product cannot be added twice in the same invoice. Please combine the quantity into one row.";

        }


        productIds.add(
          line.product_id
        );

      }


      return null;

    };


  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit =
    async (
      e: React.FormEvent
    ) => {

      e.preventDefault();


      try {

        // ======================================================
        // VALIDATE TRANSACTION NUMBER
        // ======================================================

        if (
          !transactionNumber ||
          transactionNumber ===
            "BM-"
        ) {

          toast({

            title:
              "Error",

            description:
              "Please enter the transaction number.",

            variant:
              "destructive",

          });

          return;

        }


        // ======================================================
        // VALIDATE INVOICE
        // ======================================================

        if (
          !invoiceNumber.trim()
        ) {

          toast({

            title:
              "Error",

            description:
              "Please enter the invoice number.",

            variant:
              "destructive",

          });

          return;

        }


        // ======================================================
        // VALIDATE LINES
        // ======================================================

        const validationError =
          validateProductLines();


        if (
          validationError
        ) {

          toast({

            title:
              "Error",

            description:
              validationError,

            variant:
              "destructive",

          });

          return;

        }


        // ======================================================
        // EDIT
        //
        // Hanya satu row karena edit individual.
        // ======================================================

        if (
          dialogMode ===
            "edit" &&
          editingId
        ) {

          const line =
            productLines[0];


          const payload = {

            transaction_number:
              transactionNumber,

            supplier_name:
              supplierName,

            invoice_number:
              invoiceNumber.trim(),

            product_id:
              line.product_id,

            product_name:
              line.product_name,

            product_code:
              line.product_code,

            qty:
              Number(
                line.qty
              ),

            price:
              Number(
                line.price
              ),

            total_price:
              Number(
                line.total_price
              ),

            status,

            notes,

          };


          // ====================================================
          // IMPORTANT:
          //
          // React hanya update barang_masuk.
          //
          // products.qty TIDAK disentuh.
          //
          // Supabase trigger menangani:
          //
          // Menunggu -> Diterima       +qty
          // Tidak Diterima -> Diterima +qty
          // Diterima -> Menunggu       -qty
          // Diterima -> Tidak Diterima -qty
          // Diterima -> Diterima       0
          // ====================================================

          const {
            error,
          } = await supabase
            .from("barang_masuk")
            .update(
              payload
            )
            .eq(
              "id",
              editingId
            );


          if (error) {
            throw error;
          }


          toast({

            title:
              "Success",

            description:
              "Product transaction updated successfully.",

          });

        }


        // ======================================================
        // ADD MULTIPLE PRODUCTS
        // ======================================================

        else {

          // ====================================================
          // CHECK DUPLICATE INVOICE
          //
          // Kita tidak memblokir invoice yang sudah ada secara
          // global karena invoice bisa saja diedit/dilanjutkan.
          // Tetapi kita tampilkan warning jika invoice sudah ada.
          // ====================================================

          const {
            data:
              existingInvoice,
            error:
              invoiceCheckError,
          } = await supabase

            .from(
              "barang_masuk"
            )

            .select(
              "id"
            )

            .eq(
              "invoice_number",
              invoiceNumber.trim()
            )

            .limit(1);


          if (
            invoiceCheckError
          ) {

            throw invoiceCheckError;

          }


          if (
            existingInvoice &&
            existingInvoice.length >
              0
          ) {

            const proceed =
              window.confirm(
                `Invoice ${invoiceNumber.trim()} already exists. Add these products to the same invoice?`
              );


            if (
              !proceed
            ) {

              return;

            }

          }


          // ====================================================
          // ONE INSERT STATEMENT
          //
          // Semua product masuk sebagai satu INSERT request.
          //
          // Jika salah satu row gagal, PostgreSQL akan gagalkan
          // statement tersebut.
          //
          // Tidak ada update products.qty dari React.
          // ====================================================

          const payload =
            productLines.map(
              (line) => ({

                transaction_number:
                  transactionNumber,

                supplier_name:
                  supplierName,

                invoice_number:
                  invoiceNumber.trim(),

                product_id:
                  line.product_id,

                product_name:
                  line.product_name,

                product_code:
                  line.product_code,

                qty:
                  Number(
                    line.qty
                  ),

                price:
                  Number(
                    line.price
                  ),

                total_price:
                  Number(
                    line.total_price
                  ),

                status,

                notes,

              })
            );


          const {
            error,
          } = await supabase

            .from(
              "barang_masuk"
            )

            .insert(
              payload
            );


          if (error) {
            throw error;
          }


          toast({

            title:
              "Success",

            description:
              `${productLines.length} product(s) added to invoice ${invoiceNumber}.`,

          });

        }


        // ======================================================
        // CLOSE
        // ======================================================

        setDialogOpen(false);

        resetForm();


        // ======================================================
        // REFRESH
        // ======================================================

        await fetchTransactions();

        await fetchProducts();


      } catch (
        err: any
      ) {

        console.error(err);


        toast({

          title:
            "Error",

          description:
            err?.message ||
            "Failed to save transaction.",

          variant:
            "destructive",

        });

      }

    };


  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  const formatDate =
    (
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


  // ==========================================================
  // FORMAT NUMBER
  // ==========================================================

  const formatNumber =
    (
      value: number
    ) => {

      return Number(
        value || 0
      ).toLocaleString(
        "id-ID"
      );

    };


  // ==========================================================
  // STATUS BADGE
  // ==========================================================

  const statusBadge =
    (
      value: string
    ) => {

      if (
        value ===
        STATUS_DITERIMA
      ) {

        return "bg-green-100 text-green-800";

      }


      if (
        value ===
        STATUS_TIDAK_DITERIMA
      ) {

        return "bg-red-100 text-red-800";

      }


      return "bg-yellow-100 text-yellow-800";

    };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div
      className="space-y-6"
    >

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between"
      >

        <div>

          <h1
            className="text-2xl font-bold"
          >
            Barang Masuk
          </h1>

          <p
            className="text-sm text-gray-500 mt-1"
          >
            Manage incoming stock by invoice
          </p>

        </div>


        <div
          className="flex flex-wrap gap-3 mt-4 lg:mt-0"
        >

          <Button
            onClick={
              handleAddTransaction
            }
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
                  "Transaction No",

                key:
                  "transaction_number",

              },

              {
                header:
                  "Invoice",

                key:
                  "invoice_number",

              },

              {
                header:
                  "Supplier",

                key:
                  "supplier_name",

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

      <div
        className="w-full max-w-sm"
      >

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
            "Search invoice, product, supplier..."

          className="w-full"

        />

      </div>


      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (

        <div
          className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded"
        >

          {error}

        </div>

      )}


      {/* ======================================================
          LOADING
      ====================================================== */}

      {loading && (

        <div
          className="text-center py-10 text-gray-500"
        >

          Loading transactions...

        </div>

      )}


      {/* ======================================================
          EMPTY
      ====================================================== */}

      {!loading &&
        filteredGroups.length ===
          0 && (

          <div
            className="text-center py-10 text-gray-500"
          >

            No transactions found

          </div>

        )}


      {/* ======================================================
          INVOICE GROUP TABLE
      ====================================================== */}

      {!loading &&
        filteredGroups.length >
          0 && (

          <div
            className="rounded-lg border overflow-hidden"
          >

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
                    Invoice
                  </TableCell>

                  <TableCell
                    className="font-semibold"
                  >
                    Supplier
                  </TableCell>

                  <TableCell
                    className="font-semibold"
                  >
                    Products
                  </TableCell>

                  <TableCell
                    className="text-right font-semibold"
                  >
                    Total Qty
                  </TableCell>

                  <TableCell
                    className="text-right font-semibold"
                  >
                    Total
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

                {paginatedGroups.map(
                  (
                    group
                  ) => (

                    <TableRow
                      key={
                        group.groupKey
                      }
                      className=
                        "align-top"
                    >

                      {/* DATE */}

                      <TableCell>

                        {formatDate(
                          group.created_at
                        )}

                      </TableCell>


                      {/* INVOICE */}

                      <TableCell>

                        <div
                          className="font-semibold"
                        >

                          {
                            group.invoice_number ||
                            "-"
                          }

                        </div>


                        <div
                          className="text-xs text-gray-500"
                        >

                          {
                            group.transaction_number
                          }

                        </div>

                      </TableCell>


                      {/* SUPPLIER */}

                      <TableCell>

                        {
                          group.supplier_name ||
                          "-"
                        }

                      </TableCell>


                      {/* PRODUCTS */}

                      <TableCell>

                        <div
                          className="space-y-2 min-w-[320px]"
                        >

                          {group.items.map(
                            (
                              item
                            ) => (

                              <div
                                key={
                                  item.id
                                }
                                className="flex items-center justify-between gap-4 border-b last:border-b-0 pb-2 last:pb-0"
                              >

                                <div>

                                  <div
                                    className="font-medium"
                                  >

                                    {
                                      item.product_name ||
                                      "-"
                                    }

                                  </div>


                                  <div
                                    className="text-xs text-gray-500"
                                  >

                                    {
                                      item.product_code ||
                                      "-"
                                    }

                                  </div>

                                </div>


                                <div
                                  className="text-right whitespace-nowrap"
                                >

                                  <div
                                    className="font-medium"
                                  >

                                    {formatNumber(
                                      Number(
                                        item.qty ||
                                          0
                                      )
                                    )}

                                  </div>


                                  <div
                                    className="text-xs text-gray-500"
                                  >

                                    Rp{" "}

                                    {formatNumber(
                                      Number(
                                        item.total_price ||
                                          0
                                      )
                                    )}

                                  </div>

                                </div>

                              </div>

                            )
                          )}

                        </div>

                      </TableCell>


                      {/* TOTAL QTY */}

                      <TableCell
                        className="text-right font-semibold"
                      >

                        {formatNumber(
                          group.total_qty
                        )}

                      </TableCell>


                      {/* TOTAL PRICE */}

                      <TableCell
                        className="text-right font-semibold whitespace-nowrap"
                      >

                        Rp{" "}

                        {formatNumber(
                          group.total_price
                        )}

                      </TableCell>


                      {/* STATUS */}

                      <TableCell>

                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusBadge(
                            group.status
                          )}`}
                        >

                          {
                            group.status
                          }

                        </span>

                      </TableCell>


                      {/* ACTIONS */}

                      <TableCell>

                        <div
                          className="flex flex-col gap-2"
                        >

                          {group.items.map(
                            (
                              item
                            ) => (

                              <div
                                key={
                                  item.id
                                }
                                className="flex gap-2"
                              >

                                <Button

                                  variant="outline"

                                  size="sm"

                                  onClick={() =>
                                    handleEditTransaction(
                                      item
                                    )
                                  }

                                  title={`Edit ${item.product_name}`}

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
                                      item.id
                                    )
                                  }

                                  title={`Delete ${item.product_name}`}

                                >

                                  <Trash2
                                    className="h-4 w-4"
                                  />

                                </Button>

                              </div>

                            )
                          )}

                        </div>

                      </TableCell>

                    </TableRow>

                  )
                )}

              </TableBody>

            </Table>

          </div>

        )}


      {/* ======================================================
          PAGINATION
      ====================================================== */}

      {!loading &&
        filteredGroups.length >
          0 && (

          <Pagination>

            <PaginationContent>

              <PaginationItem>

                <PaginationPrevious

                  onClick={() =>
                    setPage(
                      (
                        current
                      ) =>
                        Math.max(
                          current -
                            1,
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
                (
                  _,
                  index
                ) => (

                  <PaginationItem
                    key={
                      index
                    }
                  >

                    <PaginationLink

                      isActive={
                        page ===
                        index +
                          1
                      }

                      onClick={() =>
                        setPage(
                          index +
                            1
                        )
                      }

                    >

                      {
                        index +
                        1
                      }

                    </PaginationLink>

                  </PaginationItem>

                )
              )}


              <PaginationItem>

                <PaginationNext

                  onClick={() =>
                    setPage(
                      (
                        current
                      ) =>
                        Math.min(
                          current +
                            1,
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
          ADD / EDIT DIALOG
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
          className="w-full max-w-5xl max-h-[90vh] overflow-y-auto"
        >

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

                ? "Add multiple products to the same invoice."

                : "Edit this product line. Stock synchronization is handled by Supabase."}

            </DialogDescription>

          </DialogHeader>


          <form
            onSubmit={
              handleSubmit
            }
            className="space-y-5"
          >

            {/* ==================================================
                HEADER
            ================================================== */}

            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >

              {/* TRANSACTION */}

              <div>

                <label
                  className="block text-sm font-medium mb-1"
                >

                  Transaction No *

                </label>


                <Input

                  value={
                    transactionNumber
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


                    setTransactionNumber(
                      value
                    );

                  }}

                  required

                />

              </div>


              {/* INVOICE */}

              <div>

                <label
                  className="block text-sm font-medium mb-1"
                >

                  Invoice No *

                </label>


                <Input

                  value={
                    invoiceNumber
                  }

                  onChange={(e) =>
                    setInvoiceNumber(
                      e.target.value
                    )
                  }

                  placeholder=
                    "INV-001"

                  required

                />

              </div>


              {/* SUPPLIER */}

              <div>

                <label
                  className="block text-sm font-medium mb-1"
                >

                  Supplier

                </label>


                <Input

                  value={
                    supplierName
                  }

                  onChange={(e) =>
                    setSupplierName(
                      e.target.value
                    )
                  }

                  placeholder=
                    "Supplier name"

                />

              </div>

            </div>


            {/* ==================================================
                PRODUCT LINES
            ================================================== */}

            <div>

              <div
                className="flex items-center justify-between mb-3"
              >

                <div>

                  <h3
                    className="font-semibold"
                  >

                    Products

                  </h3>

                  <p
                    className="text-xs text-gray-500"
                  >

                    Add multiple products to this invoice.

                  </p>

                </div>


                {dialogMode ===
                  "add" && (

                  <Button

                    type="button"

                    variant="outline"

                    onClick={
                      addProductLine
                    }

                  >

                    <Plus
                      className="mr-2 h-4 w-4"
                    />

                    Add Product

                  </Button>

                )}

              </div>


              {/* PRODUCT ROWS */}

              <div
                className="space-y-3"
              >

                {productLines.map(
                  (
                    line,
                    index
                  ) => (

                    <div
                      key={
                        line.tempId
                      }
                      className="border rounded-lg p-4"
                    >

                      <div
                        className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
                      >

                        {/* PRODUCT */}

                        <div
                          className="md:col-span-5"
                        >

                          <label
                            className="block text-sm font-medium mb-1"
                          >

                            Product{" "}

                            {index +
                              1}

                          </label>


                          <Select

                            value={
                              line.product_id
                            }

                            onValueChange={(
                              value
                            ) =>
                              changeProductLine(
                                line.tempId,
                                value
                              )
                            }

                          >

                            <SelectTrigger>

                              <SelectValue
                                placeholder=
                                  "Choose product"
                              />

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

                                    {
                                      product.code
                                    }

                                    {" - "}

                                    {
                                      product.description
                                    }

                                    {" | Stock: "}

                                    {
                                      formatNumber(
                                        Number(
                                          product.qty ||
                                            0
                                        )
                                      )
                                    }

                                  </SelectItem>

                                )
                              )}

                            </SelectContent>

                          </Select>

                        </div>


                        {/* QTY */}

                        <div
                          className="md:col-span-2"
                        >

                          <label
                            className="block text-sm font-medium mb-1"
                          >

                            Qty

                          </label>


                          <Input

                            type="number"

                            min="1"

                            value={
                              line.qty
                            }

                            onChange={(e) =>
                              changeProductQty(
                                line.tempId,
                                Number(
                                  e.target.value
                                )
                              )
                            }

                          />

                        </div>


                        {/* PRICE */}

                        <div
                          className="md:col-span-2"
                        >

                          <label
                            className="block text-sm font-medium mb-1"
                          >

                            Price

                          </label>


                          <Input

                            type="number"

                            min="0"

                            value={
                              line.price
                            }

                            onChange={(e) =>
                              changeProductPrice(
                                line.tempId,
                                Number(
                                  e.target.value
                                )
                              )
                            }

                          />

                        </div>


                        {/* TOTAL */}

                        <div
                          className="md:col-span-2"
                        >

                          <label
                            className="block text-sm font-medium mb-1"
                          >

                            Total

                          </label>


                          <Input

                            value={formatNumber(
                              line.total_price
                            )}

                            disabled

                            className=
                              "bg-gray-100"

                          />

                        </div>


                        {/* REMOVE */}

                        <div
                          className="md:col-span-1"
                        >

                          {dialogMode ===
                            "add" && (

                            <Button

                              type="button"

                              variant="destructive"

                              size="icon"

                              onClick={() =>
                                removeProductLine(
                                  line.tempId
                                )
                              }

                              title="Remove product"

                            >

                              <X
                                className="h-4 w-4"
                              />

                            </Button>

                          )}

                        </div>

                      </div>


                      {/* PRODUCT INFO */}

                      {line.product_id && (

                        <div
                          className="mt-3 text-xs text-gray-500"
                        >

                          Code:{" "}

                          {
                            line.product_code ||
                            "-"
                          }

                          {" | "}

                          Product:{" "}

                          {
                            line.product_name ||
                            "-"
                          }

                        </div>

                      )}

                    </div>

                  )
                )}


                {/* EMPTY */}

                {productLines.length ===
                  0 && (

                  <div
                    className="border border-dashed rounded-lg p-8 text-center text-gray-500"
                  >

                    No products added yet.

                    <div
                      className="mt-3"
                    >

                      <Button

                        type="button"

                        variant="outline"

                        onClick={
                          addProductLine
                        }

                      >

                        <Plus
                          className="mr-2 h-4 w-4"
                        />

                        Add First Product

                      </Button>

                    </div>

                  </div>

                )}

              </div>

            </div>


            {/* ==================================================
                SUMMARY
            ================================================== */}

            <div
              className="rounded-lg bg-gray-50 border p-4"
            >

              <div
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
              >

                <div>

                  <div
                    className="text-xs text-gray-500"
                  >
                    Product Lines
                  </div>

                  <div
                    className="text-lg font-semibold"
                  >

                    {
                      productLines.length
                    }

                  </div>

                </div>


                <div>

                  <div
                    className="text-xs text-gray-500"
                  >
                    Total Qty
                  </div>

                  <div
                    className="text-lg font-semibold"
                  >

                    {formatNumber(
                      invoiceTotalQty
                    )}

                  </div>

                </div>


                <div
                  className="md:col-span-2"
                >

                  <div
                    className="text-xs text-gray-500"
                  >
                    Invoice Total
                  </div>

                  <div
                    className="text-lg font-semibold"
                  >

                    Rp{" "}

                    {formatNumber(
                      invoiceTotalPrice
                    )}

                  </div>

                </div>

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
                  status
                }

                onValueChange={
                  setStatus
                }

              >

                <SelectTrigger>

                  <SelectValue />

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
                NOTES
            ================================================== */}

            <div>

              <label
                className="block text-sm font-medium mb-1"
              >

                Notes

              </label>


              <Input

                value={
                  notes
                }

                onChange={(e) =>
                  setNotes(
                    e.target.value
                  )
                }

                placeholder=
                  "Optional notes"

              />

            </div>


            {/* ==================================================
                BUTTONS
            ================================================== */}

            <div
              className="flex justify-end gap-3 pt-4"
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

                {dialogMode ===
                "add"

                  ? "Save Invoice"

                  : "Update Product"}

              </Button>

            </div>

          </form>

        </DialogContent>

      </Dialog>

    </div>

  );

};


export default BarangMasuk;
