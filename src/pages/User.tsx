```tsx
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
  Eye,
  EyeOff,
  KeyRound,
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

  const [users, setUsers] =
    useState<UserItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  // ==========================================================
  // SEARCH / FILTER
  // ==========================================================

  const [searchTerm, setSearchTerm] =
    useState("");

  const [roleFilter, setRoleFilter] =
    useState("all");

  const [statusFilter, setStatusFilter] =
    useState("all");

  // ==========================================================
  // DIALOG
  // ==========================================================

  const [dialogOpen, setDialogOpen] =
    useState(false);

  const [dialogMode, setDialogMode] =
    useState<"add" | "edit">("add");

  // ==========================================================
  // FORM
  // ==========================================================

  const [formData, setFormData] =
    useState({
      username: "",
      email: "",
      role: "staff",
      status: "active",
    });

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  // ==========================================================
  // PAGINATION
  // ==========================================================

  const [page, setPage] =
    useState(1);

  const rowsPerPage = 10;

  const { toast } =
    useToast();

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

      // SEARCH

      if (searchTerm.trim()) {
        query = query.or(
          `username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
        );
      }

      // ROLE

      if (
        roleFilter &&
        roleFilter !== "all"
      ) {
        query = query.eq(
          "role",
          roleFilter
        );
      }

      // STATUS

      if (
        statusFilter &&
        statusFilter !== "all"
      ) {
        query = query.eq(
          "status",
          statusFilter
        );
      }

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

      // Reset page if current page
      // is no longer available

      const total =
        Math.ceil(
          (data?.length || 0) /
            rowsPerPage
        ) || 1;

      setPage((currentPage) =>
        Math.min(
          currentPage,
          total
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
  // INITIAL / FILTER FETCH
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

    setNewPassword("");
    setConfirmPassword("");

    setShowPassword(false);
    setShowConfirmPassword(false);

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

    // Password selalu kosong
    // Kita tidak pernah mengambil password lama

    setNewPassword("");
    setConfirmPassword("");

    setShowPassword(false);
    setShowConfirmPassword(false);

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
      error,
    } =
      await supabase.functions.invoke(
        "admin-user",
        {
          body: payload,
        }
      );

    if (error) {
      throw error;
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
        (u) => u.id === id
      );

    if (!user) return;

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
    // VALIDATE USERNAME
    // ========================================================

    const username =
      formData.username.trim();

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

    // ========================================================
    // VALIDATE EMAIL
    // ========================================================

    const email =
      formData.email.trim();

    if (!email) {
      toast({
        title: "Email required",
        description:
          "Please enter an email.",
        variant:
          "destructive",
      });

      return;
    }

    // ========================================================
    // PASSWORD VALIDATION
    // ========================================================

    if (
      dialogMode === "add" &&
      !newPassword
    ) {
      toast({
        title: "Password required",
        description:
          "New user must have a password.",
        variant:
          "destructive",
      });

      return;
    }

    if (newPassword) {
      if (
        newPassword.length < 8
      ) {
        toast({
          title:
            "Password too short",
          description:
            "Password must contain at least 8 characters.",
          variant:
            "destructive",
        });

        return;
      }

      if (
        newPassword !==
        confirmPassword
      ) {
        toast({
          title:
            "Password mismatch",
          description:
            "Password and confirmation password do not match.",
          variant:
            "destructive",
        });

        return;
      }
    }

    try {
      setLoading(true);

      // ======================================================
      // ADD
      // ======================================================

      if (
        dialogMode === "add"
      ) {
        await callAdminUser({
          action: "create",

          username,

          email,

          password:
            newPassword,

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
      // EDIT
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

          // Password optional
          password:
            newPassword ||
            undefined,
        });

        toast({
          title: "Success",
          description:
            newPassword
              ? "User and password updated successfully."
              : "User updated successfully.",
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

    return new Date(
      value
    ).toLocaleDateString(
      "id-ID"
    );
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-6">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">

        <h1 className="text-2xl font-bold">
          User Management
        </h1>

        <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">

          <Button
            onClick={
              handleAddUser
            }
            className="flex items-center"
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
                header:
                  "Username",
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
                header:
                  "Status",
                key: "status",
              },
              {
                header:
                  "Created At",
                key: "created_at",
              },
            ]}
            filename="users.xlsx"
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

      {/* =====================================================
          FILTER
      ===================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <Search
          value={
            searchTerm
          }
          onChange={(e) =>
            setSearchTerm(
              e.target.value
            )
          }
          placeholder="Search username or email..."
          className="w-full"
        />

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

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">

          <p>
            {error}
          </p>

        </div>
      )}

      {/* =====================================================
          EMPTY
      ===================================================== */}

      {!loading &&
        users.length === 0 && (
          <div className="text-center py-10 text-gray-500">

            No users found

          </div>
        )}

      {/* =====================================================
          TABLE
      ===================================================== */}

      {!loading &&
        users.length > 0 && (

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
                (u) => (

                  <TableRow
                    key={u.id}
                  >

                    <TableCell className="font-medium">
                      {u.username}
                    </TableCell>

                    <TableCell>
                      {u.email ||
                        "-"}
                    </TableCell>

                    <TableCell>

                      <span className="capitalize px-2 py-1 bg-gray-100 rounded text-xs">

                        {u.role ||
                          "staff"}

                      </span>

                    </TableCell>

                    <TableCell>

                      <span
                        className={`px-2 py-1 rounded-full text-xs capitalize ${
                          u.status ===
                          "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >

                        {u.status ||
                          "active"}

                      </span>

                    </TableCell>

                    <TableCell>
                      {formatDate(
                        u.created_at
                      )}
                    </TableCell>

                    <TableCell className="flex justify-center space-x-2">

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleEditUser(
                            u
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
                          handleDeleteUser(
                            u.id
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

      {/* =====================================================
          PAGINATION
      ===================================================== */}

      {!loading &&
        users.length > 0 && (

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

      {/* =====================================================
          ADD / EDIT DIALOG
      ===================================================== */}

      <Dialog
        open={
          dialogOpen
        }
        onOpenChange={
          setDialogOpen
        }
      >

        <DialogContent className="w-full max-w-md max-h-[90vh] overflow-y-auto">

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
                ? "Create a new application user."
                : "Update user information and optionally change password."}

            </DialogDescription>

          </DialogHeader>

          <form
            onSubmit={
              handleSubmit
            }
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
                    (prev) => ({
                      ...prev,
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

            {/* EMAIL */}

            <div>

              <label className="block text-sm font-medium mb-1">
                Email *
              </label>

              <Input
                type="email"
                value={
                  formData.email
                }
                onChange={(e) =>
                  setFormData(
                    (prev) => ({
                      ...prev,
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

            {/* PASSWORD */}

            <div>

              <div className="flex items-center gap-2 mb-1">

                <KeyRound className="h-4 w-4" />

                <label className="block text-sm font-medium">
                  {dialogMode ===
                  "add"
                    ? "Password *"
                    : "New Password"}
                </label>

              </div>

              <div className="relative">

                <Input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    newPassword
                  }
                  onChange={(e) =>
                    setNewPassword(
                      e.target
                        .value
                    )
                  }
                  placeholder={
                    dialogMode ===
                    "add"
                      ? "Minimum 8 characters"
                      : "Leave blank to keep current password"
                  }
                  minLength={8}
                  required={
                    dialogMode ===
                    "add"
                  }
                  className="pr-10"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (v) => !v
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >

                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}

                </button>

              </div>

            </div>

            {/* CONFIRM PASSWORD */}

            <div>

              <label className="block text-sm font-medium mb-1">
                Confirm Password
              </label>

              <div className="relative">

                <Input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    confirmPassword
                  }
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target
                        .value
                    )
                  }
                  placeholder="Confirm password"
                  minLength={8}
                  required={
                    dialogMode ===
                      "add" ||
                    !!newPassword
                  }
                  className="pr-10"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (v) => !v
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >

                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}

                </button>

              </div>

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
                  val
                ) =>
                  setFormData(
                    (prev) => ({
                      ...prev,
                      role: val,
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
                  val
                ) =>
                  setFormData(
                    (prev) => ({
                      ...prev,
                      status: val,
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
