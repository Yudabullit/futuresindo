import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Search } from "@/components/ui/search";
import { Trash2, Edit3, Plus, Download } from "lucide-react";
import { XlsxTable } from "@/components/ui/xlsx-table";

const Products = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    type: "",
    qty: 0,
    price: 0,
    box: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let query = supabase.from("products").select("*");

      if (searchTerm) {
        query = query.or(`code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      if (typeFilter && typeFilter !== "ALL") {
        query = query.eq("type", typeFilter);
      }

      query = query.order(sortBy, { ascending: sortOrder === "asc" });

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    setDialogMode("add");
    setFormData({
      code: "",
      description: "",
      type: "",
      qty: 0,
      price: 0,
      box: 0,
    });
    setDialogOpen(true);
  };

  const handleEditProduct = (product: any) => {
    setDialogMode("edit");
    setFormData({
      code: product.code,
      description: product.description,
      type: product.type || "",
      qty: product.qty || 0,
      price: product.price || 0,
      box: product.box || 0,
    });
    setEditingId(product.id);
    setDialogOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      await fetchProducts();
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (dialogMode === "add") {
        const { error } = await supabase.from("products").insert([formData]);
        if (error) throw error;
        toast({
          title: "Success",
          description: "Product added successfully",
        });
      } else {
        const { error } = await supabase
          .from("products")
          .update(formData)
          .eq("id", editingId);
        if (error) throw error;
        toast({
          title: "Success",
          description: "Product updated successfully",
        });
      }
      setDialogOpen(false);
      await fetchProducts();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save product",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchTerm, typeFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(products.length / rowsPerPage) || 1;
  const paginatedProducts = products.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">
          <Button onClick={handleAddProduct} className="flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
          <XlsxTable
            data={products}
            columns={[
              { header: "Code", key: "code" },
              { header: "Description", key: "description" },
              { header: "Type", key: "type" },
              { header: "Qty", key: "qty" },
              { header: "Price", key: "price" },
              { header: "Box", key: "box" },
            ]}
            filename="products.xlsx"
            className="flex items-center"
          >
            <Button variant="outline" size="sm" className="px-3">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </XlsxTable>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Search
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products..."
            className="w-full"
          />
        </div>
        <div className="flex-1 min-w-0 lg:w-48">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FINS">FINS</SelectItem>
              <SelectItem value="PADS">PADS</SelectItem>
              <SelectItem value="PLUGS">PLUGS</SelectItem>
              <SelectItem value="ACCESSORIES">ACCESSORIES</SelectItem>
              <SelectItem value="OTHER">OTHER</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-0 lg:w-48 flex justify-end lg:justify-start">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            Sort by: {sortBy === "created_at" ? "Date" : sortBy.toUpperCase()} {sortOrder === "asc" ? "↑" : "↓"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4">
          <p>{error}</p>
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="text-center py-10">
          <p className="text-gray-500">No products found</p>
        </div>
      )}

      {!loading && products.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell className="w-20 font-semibold">Code</TableCell>
              <TableCell className="font-semibold">Description</TableCell>
              <TableCell className="w-24 font-semibold">Type</TableCell>
              <TableCell className="w-16 text-right font-semibold">Qty</TableCell>
              <TableCell className="w-28 text-right font-semibold">Price</TableCell>
              <TableCell className="w-16 text-center font-semibold">Box</TableCell>
              <TableCell className="w-24 text-center font-semibold">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.code}</TableCell>
                <TableCell>{product.description}</TableCell>
                <TableCell>{product.type}</TableCell>
                <TableCell className="text-right">{product.qty?.toLocaleString() || "0"}</TableCell>
                <TableCell className="text-right">
                  Rp {Number(product.price || 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-center">{product.box}</TableCell>
                <TableCell className="flex justify-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditProduct(product)}
                    className="px-3"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteProduct(product.id)}
                    className="px-3"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {!loading && products.length > 0 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={() => setPage((p) => Math.max(p - 1, 1))} />
            </PaginationItem>
            {Array.from({ length: totalPages }).map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  isActive={i + 1 === page}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext onClick={() => setPage((p) => Math.min(p + 1, totalPages))} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "add" ? "Add Product" : "Edit Product"}
            </DialogTitle>
            <DialogDescription>
              Fill in the product details below
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium">Code *</label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Enter product code"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">Description *</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter product description"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium">Type *</label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
              <SelectItem value="FINS">FINS</SelectItem>
              <SelectItem value="PADS">PADS</SelectItem>
              <SelectItem value="PLUGS">PLUGS</SelectItem>
              <SelectItem value="ACCESSORIES">ACCESSORIES</SelectItem>
              <SelectItem value="OTHER">OTHER</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">Qty *</label>
                <Input
                  type="number"
                  value={formData.qty}
                  onChange={(e) => setFormData({ ...formData, qty: Number(e.target.value) || 0 })}
                  placeholder="Enter quantity"
                  required
                  min="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium">Price *</label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) || 0 })}
                  placeholder="Enter price"
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">Box</label>
                <Input
                  type="number"
                  value={formData.box}
                  onChange={(e) => setFormData({ ...formData, box: Number(e.target.value) || 0 })}
                  placeholder="Enter box quantity"
                  min="0"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {dialogMode === "add" ? "Add Product" : "Update Product"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;