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

interface UserItem {
  id: string;
  username: string;
  role: string;
  status: string;
  created_at: string;
}

const User = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState({
    username: "",
    role: "staff",
    status: "active",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let query = supabase.from("users").select("*").order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.ilike("username", `%${searchTerm}%`);
      }
      if (roleFilter) {
        query = query.eq("role", roleFilter);
      }
      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setUsers(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, roleFilter, statusFilter]);

  const handleAddUser = () => {
    setDialogMode("add");
    setFormData({ username: "", role: "staff", status: "active" });
    setDialogOpen(true);
  };

  const handleEditUser = (user: UserItem) => {
    setDialogMode("edit");
    setFormData({
      username: user.username,
      role: user.role || "staff",
      status: user.status || "active",
    });
    setEditingId(user.id);
    setDialogOpen(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      const { error } = await supabase.from("users").delete().eq("id", id);
      if (error) throw error;
      await fetchUsers();
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (dialogMode === "add") {
        const { error } = await supabase.from("users").insert({
          id: crypto.randomUUID(),
          username: formData.username,
          role: formData.role,
          status: formData.status,
        });
        if (error) throw error;
        toast({
          title: "Success",
          description: "User added successfully",
        });
      } else if (editingId) {
        const { error } = await supabase
          .from("users")
          .update({
            username: formData.username,
            role: formData.role,
            status: formData.status,
          })
          .eq("id", editingId);
        if (error) throw error;
        toast({
          title: "Success",
          description: "User updated successfully",
        });
      }
      setDialogOpen(false);
      await fetchUsers();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save user",
        variant: "destructive",
      });
    }
  };

  const rowsPerPage = 10;
  const totalPages = Math.ceil(users.length / rowsPerPage) || 1;
  const paginatedUsers = users.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">
          <Button onClick={handleAddUser} className="flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
          <XlsxTable
            data={users}
            columns={[
              { header: "ID", key: "id" },
              { header: "Username", key: "username" },
              { header: "Role", key: "role" },
              { header: "Status", key: "status" },
              { header: "Created At", key: "created_at" },
            ]}
            filename="users.xlsx"
            className="flex items-center"
          >
            <Button variant="outline" size="sm" className="px-3">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </XlsxTable>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Search
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by username..."
          className="w-full"
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filter by Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p>{error}</p>
        </div>
      )}

      {!loading && users.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          No users found
        </div>
      )}

      {!loading && users.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell className="font-semibold">Username</TableCell>
              <TableCell className="font-semibold">Role</TableCell>
              <TableCell className="font-semibold">Status</TableCell>
              <TableCell className="font-semibold">Created At</TableCell>
              <TableCell className="text-center font-semibold">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.username}</TableCell>
                <TableCell>
                  <span className="capitalize px-2 py-1 bg-gray-100 rounded text-xs">
                    {u.role || "staff"}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs capitalize ${
                      u.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {u.status || "active"}
                  </span>
                </TableCell>
                <TableCell>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString("id-ID") : "-"}
                </TableCell>
                <TableCell className="flex justify-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditUser(u)}
                    className="px-3"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteUser(u.id)}
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

      {!loading && users.length > 0 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              />
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
              <PaginationNext
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "add" ? "Add User" : "Edit User"}
            </DialogTitle>
            <DialogDescription>
              Enter details for the user account below
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium mb-1">Username *</label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Enter username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role *</label>
              <Select
                value={formData.role}
                onValueChange={(val) => setFormData({ ...formData, role: val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status *</label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {dialogMode === "add" ? "Add User" : "Update User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default User;