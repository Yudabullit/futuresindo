
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

import {
  Trash2,
  Edit3,
  Plus,
  Download,
  Search as SearchIcon,
} from "lucide-react";

import { XlsxTable } from "@/components/ui/xlsx-table";

// ============================================================
// TYPE
// ============================================================

interface UserItem {
  id: string;
  username: string;
  email: string | null;
  role: string;
  status: string;
  created_at: string;
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

  const [formData, setFormData] = useState({
    username: "",
    email: "",
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
          "id, username, email, role, status, created_at"
        )
        .order("created_at", {
          ascending: false,
        });

      // ======================================================
      // SEARCH
      // ======================================================

      if (searchTerm.trim()) {
        const search = searchTerm.trim();

        query = query.or(
          `username.ilike.%${search}%,email.ilike.%${search}%`
        );
      }

      // ======================================================
      // ROLE FILTER
      // ======================================================

      if (
        roleFilter !== "all"
      ) {
        query = query.eq(
          "role",
          roleFilter
        );
      }

      // ======================================================
      // STATUS FILTER
      // ======================================================

      if (
        statusFilter !== "all"
      ) {
        query = query.eq(
          "status",
          statusFilter
        );
      }

      // ======================================================
      // EXECUTE
      // ======================================================

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

      // ======================================================
      // RESET PAGE
      // ======================================================

      const calculatedPages =
        Math.ceil(
          (data?.length || 0) /
            rowsPerPage
        ) || 1;

      setPage((currentPage) =>
        Math.min(
          currentPage,
          calculatedPages
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
  // SEARCH / FILTER EFFECT
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
      email: "",
      role: "staff",
      status: "active",
    });

    setEditingId(null);
  };

  // ==========================================================
  // ADD USER
  // ==========================================================

  const handleAddUser = () => {
    resetForm();

    setDialogMode("add");
    setDialogOpen(true);
  };

  // ==========================================================
  // EDIT USER
  // ==========================================================

  const handleEditUser = (
    user: UserItem
  ) => {
    setDialogMode("edit");

    setFormData({
      username:
        user.username || "",

      email:
        user.email || "",

      role:
        user.role || "staff",

      status:
        user.status || "active",
    });

    setEditingId(user.id);

    setDialogOpen(true);
  };

  // ==========================================================
  // CALL EDGE FUNCTION
  // ==========================================================

  const callAdminUser = async (
    payload: Record<string, unknown>
  ) => {
    const {
      data,
      error: functionError,
    } =
      await supabase.functions.invoke(
        "admin-user",
        {
          body: payload,
        }
      );

    if (functionError) {
      console.error(
        "ADMIN USER FUNCTION ERROR:",
        functionError
      );

      throw new Error(
        functionError.message ||
          "Failed to send request."
      );
    }

    if (
      !data ||
      data.success !== true
    ) {
      throw new Error(
        data?.error ||
          "Operation failed."
      );
    }

    return data;
  };

  // ==========================================================
  // DELETE USER
  // ==========================================================

  const handleDeleteUser = async (
    id: string
  ) => {
    const user =
      users.find(
        (item) =>
          item.id === id
      );

    if (!user) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete user "${user.username}"?\n\nThis will delete the authentication account too.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);

      await callAdminUser({
        action: "delete",
        user_id: id,
      });

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
  // SUBMIT
  // ==========================================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    // ========================================================
    // USERNAME
    // ========================================================

    const username =
      formData.username.trim();

    if (!username) {
      toast({
        title:
          "Username required",
        description:
          "Please enter a username.",
        variant:
          "destructive",
      });

      return;
    }

    // ========================================================
    // EMAIL
    // ========================================================

    const email =
      formData.email.trim();

    if (!email) {
      toast({
        title:
          "Email required",
        description:
          "Please enter an email.",
        variant:
          "destructive",
      });

      return;
    }

    // ========================================================
    // SAVE
    // ========================================================

    try {
      setLoading(true);

      // ======================================================
      // CREATE
      // ======================================================

      if (
        dialogMode === "add"
      ) {
        await callAdminUser({
          action: "create",
          username,
          email,
          role:
            formData.role,
          status:
            formData.status,
        });

        toast({
          title: "Success",
          description:
            "User created successfully.",
        });
      }

      // ======================================================
      // UPDATE
      // ======================================================

      else {
        if (!editingId) {
          throw new Error(
            "User ID is missing."
          );
        }

        await callAdminUser({
          action: "update",
          user_id:
            editingId,
          username,
          email,
          role:
            formData.role,
          status:
            formData.status,
        });

        toast({
          title: "Success",
          description:
            "User updated successfully.",
        });
      }

      // ======================================================
      // CLOSE
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
  // DATE
  // ==========================================================

  const formatDate = (
    value: string | null
  ) => {
    if (!value) {
      return "-";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
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

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        <h1 className="text-2xl font-bold">
          User Management
        </h1>

        <div className="flex flex-wrap gap-3">

          <Button
            type="button"
            onClick={
              handleAddUser
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>

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
                header: "Email",
                key: "email",
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

        <div className="relative">

          <SearchIcon
            className="
              absolute
              left-3
              top-1/2
              -translate-y-1/2
              h-4
              w-4
              text-gray-400
            "
          />

          <Input
            value={
              searchTerm
            }
            onChange={(e) =>
              setSearchTerm(
                e.target.value
              )
            }
            placeholder="Search username or email..."
            className="pl-9"
          />

        </div>

        {/* ROLE */}

        <Select
          value={
            roleFilter
          }
          onValueChange={
            setRoleFilter
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
          value={
            statusFilter
          }
          onValueChange={
            setStatusFilter
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
        <div className="rounded border-l-4 border-red-500 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* ====================================================
          LOADING
      ==================================================== */}

      {loading && (
        <div className="py-10 text-center text-gray-500">
          Loading users...
        </div>
      )}

      {/* ====================================================
          EMPTY
      ==================================================== */}

      {!loading &&
        users.length === 0 && (
          <div className="py-10 text-center text-gray-500">
            No users found
          </div>
        )}

      {/* ====================================================
          TABLE
      ==================================================== */}

      {!loading &&
        users.length > 0 && (

          <div className="overflow-x-auto">

            <Table>

              <TableHeader>

                <TableRow>

                  <TableCell className="font-semibold">
                    Username
                  </TableCell>

                  <TableCell className="font-semibold">
                    Email
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
                      key={
                        user.id
                      }
                    >

                      <TableCell className="font-medium">
                        {user.username}
                      </TableCell>

                      <TableCell>
                        {user.email ||
                          "-"}
                      </TableCell>

                      <TableCell>

                        <span className="capitalize rounded bg-gray-100 px-2 py-1 text-xs">
                          {user.role ||
                            "staff"}
                        </span>

                      </TableCell>

                      <TableCell>

                        <span
                          className={`rounded-full px-2 py-1 text-xs capitalize ${
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

                      <TableCell>
                        {formatDate(
                          user.created_at
                        )}
                      </TableCell>

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
        users.length > 0 && (

          <Pagination>

            <PaginationContent>

              <PaginationItem>

                <PaginationPrevious
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.max(
                          current - 1,
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
                (_, index) => (

                  <PaginationItem
                    key={
                      index
                    }
                  >

                    <PaginationLink
                      isActive={
                        page ===
                        index + 1
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

              <PaginationItem>

                <PaginationNext
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.min(
                          current + 1,
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
        open={
          dialogOpen
        }
        onOpenChange={(
          open
        ) => {

          setDialogOpen(
            open
          );

          if (!open) {
            resetForm();
          }

        }}
      >

        <DialogContent className="w-full max-w-md">

          <DialogHeader>

            <DialogTitle>

              {dialogMode ===
              "add"
                ? "Add User"
                : "Edit User"}

            </DialogTitle>

            <DialogDescription>

              {dialogMode ===
              "add"
                ? "Create a new user profile."
                : "Update user profile information."}

            </DialogDescription>

          </DialogHeader>

          <form
            onSubmit={
              handleSubmit
            }
            className="mt-2 space-y-4"
          >

            {/* =================================================
                USERNAME
            ================================================= */}

            <div>

              <label className="mb-1 block text-sm font-medium">
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
                        e.target
                          .value,
                    })
                  )
                }
                placeholder="Enter username"
                required
              />

            </div>

            {/* =================================================
                EMAIL
            ================================================= */}

            <div>

              <label className="mb-1 block text-sm font-medium">
                Email *
              </label>

              <Input
                type="email"
                value={
                  formData.email
                }
                onChange={(e) =>
                  setFormData(
                    (previous) => ({
                      ...previous,
                      email:
                        e.target
                          .value,
                    })
                  )
                }
                placeholder="user@example.com"
                required
              />

            </div>

            {/* =================================================
                ROLE
            ================================================= */}

            <div>

              <label className="mb-1 block text-sm font-medium">
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

            {/* =================================================
                STATUS
            ================================================= */}

            <div>

              <label className="mb-1 block text-sm font-medium">
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
                      status:
                        value,
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

            {/* =================================================
                BUTTON
            ================================================= */}

            <div className="flex justify-end gap-3 pt-4">

              <Button
                type="button"
                variant="outline"
                disabled={
                  loading
                }
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
                disabled={
                  loading
                }
              >
                {loading
                  ? "Saving..."
                  : dialogMode ===
                    "add"
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
