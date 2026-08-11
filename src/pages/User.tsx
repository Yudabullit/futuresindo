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

interface UserItem {
  id: string;
  username: string;
  role: string;
  status: string;
  created_at: string;
}

// ============================================================
// FORM TYPE
// ============================================================

interface UserFormData {
  username: string;
  role: string;
  status: string;
}

// ============================================================
// COMPONENT
// ============================================================

const User = () => {
  // ==========================================================
  // DATA
  // ==========================================================

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ==========================================================
  // SEARCH / FILTER
  // ==========================================================

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // ==========================================================
  // DIALOG
  // ==========================================================

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] =
    useState<"add" | "edit">("add");

  // ==========================================================
  // FORM
  // ==========================================================

  const [formData, setFormData] = useState<UserFormData>({
    username: "",
    role: "staff",
    status: "active",
  });

  // ==========================================================
  // EDITING
  // ==========================================================

  const [editingId, setEditingId] =
    useState<string | null>(null);

  // ==========================================================
  // PAGINATION
  // ==========================================================

  const [page, setPage] = useState(1);

  const rowsPerPage = 10;

  // ==========================================================
  // TOAST
  // ==========================================================

  const { toast } = useToast();

  // ==========================================================
  // FETCH USERS
  // ==========================================================

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("users")
        .select(
          "id, username, role, status, created_at"
        )
        .order("created_at", {
          ascending: false,
        });

      // ------------------------------------------------------
      // SEARCH
      // ------------------------------------------------------

      if (searchTerm.trim()) {
        query = query.ilike(
          "username",
          `%${searchTerm.trim()}%`
        );
      }

      // ------------------------------------------------------
      // ROLE FILTER
      // ------------------------------------------------------

      if (roleFilter !== "all") {
        query = query.eq(
          "role",
          roleFilter
        );
      }

      // ------------------------------------------------------
      // STATUS FILTER
      // ------------------------------------------------------

      if (statusFilter !== "all") {
        query = query.eq(
          "status",
          statusFilter
        );
      }

      // ------------------------------------------------------
      // EXECUTE QUERY
      // ------------------------------------------------------

      const {
        data,
        error: fetchError,
      } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setUsers(
        (data || []) as UserItem[]
      );

      // ------------------------------------------------------
      // RESET PAGE IF NECESSARY
      // ------------------------------------------------------

      const totalPages =
        Math.ceil(
          (data?.length || 0) /
            rowsPerPage
        ) || 1;

      setPage((currentPage) =>
        Math.min(
          currentPage,
          totalPages
        )
      );
    } catch (err: any) {
      console.error(
        "FETCH USERS ERROR:",
        err
      );

      setError(
        err?.message ||
          "Failed to load users."
      );

      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // FETCH ON SEARCH / FILTER CHANGE
  // ==========================================================

  useEffect(() => {
    fetchUsers();
  }, [
    searchTerm,
    roleFilter,
    statusFilter,
  ]);

  // ==========================================================
  // RESET FORM
  // ==========================================================

  const resetForm = () => {
    setFormData({
      username: "",
      role: "staff",
      status: "active",
    });

    setEditingId(null);
  };

  // ==========================================================
  // OPEN ADD USER
  // ==========================================================

  const handleAddUser = () => {
    resetForm();

    setDialogMode("add");
    setDialogOpen(true);
  };

  // ==========================================================
  // OPEN EDIT USER
  // ==========================================================

  const handleEditUser = (
    user: UserItem
  ) => {
    setDialogMode("edit");

    setFormData({
      username: user.username || "",
      role: user.role || "staff",
      status: user.status || "active",
    });

    setEditingId(user.id);
    setDialogOpen(true);
  };

  // ==========================================================
  // DELETE USER
  // ==========================================================

  const handleDeleteUser = async (
    id: string
  ) => {
    const user = users.find(
      (item) => item.id === id
    );

    if (!user) {
      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to delete user "${user.username}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const {
        error: deleteError,
      } = await supabase
        .from("users")
        .delete()
        .eq("id", id);

      if (deleteError) {
        throw deleteError;
      }

      toast({
        title: "Success",
        description:
          "User deleted successfully.",
      });

      await fetchUsers();
    } catch (err: any) {
      console.error(
        "DELETE USER ERROR:",
        err
      );

      toast({
        title: "Error",
        description:
          err?.message ||
          "Failed to delete user.",
        variant:
          "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // SUBMIT ADD / EDIT
  // ==========================================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const username =
      formData.username.trim();

    // --------------------------------------------------------
    // VALIDATE USERNAME
    // --------------------------------------------------------

    if (!username) {
      toast({
        title: "Username required",
        description:
          "Please enter a username.",
        variant:
          "destructive",
      });

      return;
    }

    try {
      setLoading(true);
      setError(null);

      // ======================================================
      // ADD USER
      // ======================================================

      if (dialogMode === "add") {
        const {
          error: insertError,
        } = await supabase
          .from("users")
          .insert({
            id: crypto.randomUUID(),
            username,
            role: formData.role,
            status: formData.status,
          });

        if (insertError) {
          throw insertError;
        }

        toast({
          title: "Success",
          description:
            "User added successfully.",
        });
      }

      // ======================================================
      // EDIT USER
      // ======================================================

      if (
        dialogMode === "edit" &&
        editingId
      ) {
        const {
          error: updateError,
        } = await supabase
          .from("users")
          .update({
            username,
            role: formData.role,
            status: formData.status,
          })
          .eq("id", editingId);

        if (updateError) {
          throw updateError;
        }

        toast({
          title: "Success",
          description:
            "User updated successfully.",
        });
      }

      // ======================================================
      // CLOSE DIALOG
      // ======================================================

      setDialogOpen(false);
      resetForm();

      await fetchUsers();
    } catch (err: any) {
      console.error(
        "SAVE USER ERROR:",
        err
      );

      toast({
        title: "Error",
        description:
          err?.message ||
          "Failed to save user.",
        variant:
          "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // PAGINATION
  // ==========================================================

  const totalPages =
    Math.ceil(
      users.length /
        rowsPerPage
    ) || 1;

  const paginatedUsers =
    users.slice(
      (page - 1) *
        rowsPerPage,
      page *
        rowsPerPage
    );

  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  const formatDate = (
    value: string | null
  ) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString(
      "id-ID"
    );
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

        <h1 className="text-2xl font-bold">
          User Management
        </h1>

        <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">

          {/* ADD USER */}

          <Button
            onClick={handleAddUser}
            className="flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>

          {/* EXPORT */}

          <XlsxTable
            data={users}
            columns={[
              {
                header: "ID",
                key: "id",
              },
              {
                header: "Username",
                key: "username",
              },
              {
                header: "Role",
                key: "role",
              },
              {
                header: "Status",
                key: "status",
              },
              {
                header: "Created At",
                key: "created_at",
              },
            ]}
            filename="users.xlsx"
            className="flex items-center"
          >
            <Button
              type="button"
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
          FILTERS
      ==================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* SEARCH */}

        <Search
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(
              e.target.value
            )
          }
          placeholder="Search by username..."
          className="w-full"
        />

        {/* ROLE */}

        <Select
          value={roleFilter}
          onValueChange={
            (value) =>
              setRoleFilter(value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filter by Role" />
          </SelectTrigger>

          <SelectContent>

            <SelectItem value="all">
              All Roles
            </SelectItem>

            <SelectItem value="admin">
              Admin
            </SelectItem>

            <SelectItem value="manager">
              Manager
            </SelectItem>

            <SelectItem value="staff">
              Staff
            </SelectItem>

          </SelectContent>
        </Select>

        {/* STATUS */}

        <Select
          value={statusFilter}
          onValueChange={
            (value) =>
              setStatusFilter(value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>

          <SelectContent>

            <SelectItem value="all">
              All Status
            </SelectItem>

            <SelectItem value="active">
              Active
            </SelectItem>

            <SelectItem value="inactive">
              Inactive
            </SelectItem>

          </SelectContent>
        </Select>

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
          Loading users...
        </div>
      )}

      {/* ====================================================
          EMPTY
      ==================================================== */}

      {!loading &&
        users.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            No users found.
          </div>
        )}

      {/* ====================================================
          TABLE
      ==================================================== */}

      {!loading &&
        users.length > 0 && (
          <Table>

            <TableHeader>

              <TableRow>

                <TableCell className="font-semibold">
                  Username
                </TableCell>

                <TableCell className="font-semibold">
                  Role
                </TableCell>

                <TableCell className="font-semibold">
                  Status
                </TableCell>

                <TableCell className="font-semibold">
                  Created At
                </TableCell>

                <TableCell className="text-center font-semibold">
                  Actions
                </TableCell>

              </TableRow>

            </TableHeader>

            <TableBody>

              {paginatedUsers.map(
                (user) => (
                  <TableRow
                    key={user.id}
                  >

                    {/* USERNAME */}

                    <TableCell className="font-medium">
                      {user.username}
                    </TableCell>

                    {/* ROLE */}

                    <TableCell>

                      <span className="capitalize px-2 py-1 bg-gray-100 rounded text-xs">
                        {user.role ||
                          "staff"}
                      </span>

                    </TableCell>

                    {/* STATUS */}

                    <TableCell>

                      <span
                        className={`px-2 py-1 rounded-full text-xs capitalize ${
                          user.status ===
                          "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.status ||
                          "active"}
                      </span>

                    </TableCell>

                    {/* CREATED */}

                    <TableCell>
                      {formatDate(
                        user.created_at
                      )}
                    </TableCell>

                    {/* ACTIONS */}

                    <TableCell>
                      <div className="flex justify-center gap-2">

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleEditUser(
                              user
                            )
                          }
                          className="px-3"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            handleDeleteUser(
                              user.id
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
        )}

      {/* ====================================================
          PAGINATION
      ==================================================== */}

      {!loading &&
        users.length > 0 && (
          <Pagination>

            <PaginationContent>

              {/* PREVIOUS */}

              <PaginationItem>

                <PaginationPrevious
                  onClick={() =>
                    setPage(
                      (currentPage) =>
                        Math.max(
                          currentPage - 1,
                          1
                        )
                    )
                  }
                />

              </PaginationItem>

              {/* PAGE NUMBERS */}

              {Array.from({
                length: totalPages,
              }).map(
                (_, index) => (
                  <PaginationItem
                    key={index}
                  >

                    <PaginationLink
                      isActive={
                        index + 1 ===
                        page
                      }
                      onClick={() =>
                        setPage(
                          index + 1
                        )
                      }
                    >
                      {index + 1}
                    </PaginationLink>

                  </PaginationItem>
                )
              )}

              {/* NEXT */}

              <PaginationItem>

                <PaginationNext
                  onClick={() =>
                    setPage(
                      (currentPage) =>
                        Math.min(
                          currentPage + 1,
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
        onOpenChange={(open) => {
          setDialogOpen(open);

          if (!open) {
            resetForm();
          }
        }}
      >

        <DialogContent className="w-full max-w-md">

          <DialogHeader>

            <DialogTitle>
              {dialogMode === "add"
                ? "Add User"
                : "Edit User"}
            </DialogTitle>

            <DialogDescription>
              {dialogMode === "add"
                ? "Create a new application user."
                : "Update user information."}
            </DialogDescription>

          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 mt-2"
          >

            {/* USERNAME */}

            <div>

              <label className="block text-sm font-medium mb-1">
                Username *
              </label>

              <Input
                value={
                  formData.username
                }
                onChange={(e) =>
                  setFormData(
                    (previous) => ({
                      ...previous,
                      username:
                        e.target.value,
                    })
                  )
                }
                placeholder="Enter username"
                required
              />

            </div>

            {/* ROLE */}

            <div>

              <label className="block text-sm font-medium mb-1">
                Role *
              </label>

              <Select
                value={
                  formData.role
                }
                onValueChange={(
                  value
                ) =>
                  setFormData(
                    (previous) => ({
                      ...previous,
                      role: value,
                    })
                  )
                }
              >

                <SelectTrigger className="w-full">

                  <SelectValue placeholder="Select role" />

                </SelectTrigger>

                <SelectContent>

                  <SelectItem value="admin">
                    Admin
                  </SelectItem>

                  <SelectItem value="manager">
                    Manager
                  </SelectItem>

                  <SelectItem value="staff">
                    Staff
                  </SelectItem>

                </SelectContent>

              </Select>

            </div>

            {/* STATUS */}

            <div>

              <label className="block text-sm font-medium mb-1">
                Status *
              </label>

              <Select
                value={
                  formData.status
                }
                onValueChange={(
                  value
                ) =>
                  setFormData(
                    (previous) => ({
                      ...previous,
                      status: value,
                    })
                  )
                }
              >

                <SelectTrigger className="w-full">

                  <SelectValue placeholder="Select status" />

                </SelectTrigger>

                <SelectContent>

                  <SelectItem value="active">
                    Active
                  </SelectItem>

                  <SelectItem value="inactive">
                    Inactive
                  </SelectItem>

                </SelectContent>

              </Select>

            </div>

            {/* BUTTONS */}

            <div className="flex justify-end gap-3 pt-4">

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setDialogOpen(
                    false
                  )
                }
                disabled={loading}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Saving..."
                  : dialogMode === "add"
                  ? "Add User"
                  : "Update User"}
              </Button>

            </div>

          </form>

        </DialogContent>

      </Dialog>

    </div>
  );
};

export default User;
```
