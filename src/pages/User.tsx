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
  KeyRound,
  Eye,
  EyeOff,
  Download,
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
  // SEARCH
  // ==========================================================

  const [searchTerm, setSearchTerm] =
    useState("");

  const [roleFilter, setRoleFilter] =
    useState("all");

  const [statusFilter, setStatusFilter] =
    useState("all");

  // ==========================================================
  // PASSWORD DIALOG
  // ==========================================================

  const [passwordDialogOpen, setPasswordDialogOpen] =
    useState(false);

  const [selectedUser, setSelectedUser] =
    useState<UserItem | null>(null);

  // ==========================================================
  // PASSWORD
  // ==========================================================

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [changingPassword, setChangingPassword] =
    useState(false);

  // ==========================================================
  // PAGINATION
  // ==========================================================

  const [page, setPage] =
    useState(1);

  const rowsPerPage = 10;

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
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      // SEARCH

      if (searchTerm.trim()) {
        const search =
          searchTerm.trim();

        query = query.or(
          `username.ilike.%${search}%,email.ilike.%${search}%`
        );
      }

      // ROLE

      if (
        roleFilter !== "all"
      ) {
        query = query.eq(
          "role",
          roleFilter
        );
      }

      // STATUS

      if (
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

      const totalPages =
        Math.ceil(
          (data?.length || 0) /
            rowsPerPage
        ) || 1;

      setPage((current) =>
        Math.min(
          current,
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
  // FETCH WHEN FILTER CHANGES
  // ==========================================================

  useEffect(() => {
    fetchUsers();
  }, [
    searchTerm,
    roleFilter,
    statusFilter,
  ]);

  // ==========================================================
  // OPEN PASSWORD DIALOG
  // ==========================================================

  const openPasswordDialog = (
    user: UserItem
  ) => {
    setSelectedUser(user);

    setNewPassword("");
    setConfirmPassword("");

    setShowPassword(false);
    setShowConfirmPassword(false);

    setPasswordDialogOpen(true);
  };

  // ==========================================================
  // CLOSE PASSWORD DIALOG
  // ==========================================================

  const closePasswordDialog = () => {
    if (changingPassword) {
      return;
    }

    setPasswordDialogOpen(false);

    setSelectedUser(null);

    setNewPassword("");
    setConfirmPassword("");

    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // ==========================================================
  // CHANGE PASSWORD
  // ==========================================================

  const handleChangePassword = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    // ========================================================
    // USER CHECK
    // ========================================================

    if (!selectedUser) {
      toast({
        title: "Error",
        description:
          "No user selected.",
        variant:
          "destructive",
      });

      return;
    }

    // ========================================================
    // PASSWORD
    // ========================================================

    const password =
      newPassword;

    if (!password) {
      toast({
        title:
          "Password required",
        description:
          "Please enter a new password.",
        variant:
          "destructive",
      });

      return;
    }

    // ========================================================
    // MIN LENGTH
    // ========================================================

    if (password.length < 8) {
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

    // ========================================================
    // CONFIRM
    // ========================================================

    if (
      password !==
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

    // ========================================================
    // START
    // ========================================================

    try {
      setChangingPassword(true);

      // ======================================================
      // GET CURRENT SESSION
      // ======================================================

      let {
        data: sessionData,
      } = await supabase.auth.getSession();

      let session =
        sessionData.session;

      // ======================================================
      // NO SESSION
      // ======================================================

      if (!session) {
        toast({
          title:
            "Session expired",
          description:
            "Please login again.",
          variant:
            "destructive",
        });

        return;
      }

      // ======================================================
      // REFRESH SESSION
      //
      // This is important.
      //
      // It prevents sending an expired
      // access token to the Edge Function.
      // ======================================================

      const {
        data: refreshedData,
        error: refreshError,
      } =
        await supabase.auth.refreshSession();

      if (
        refreshError ||
        !refreshedData.session
      ) {
        console.error(
          "REFRESH SESSION ERROR:",
          refreshError
        );

        toast({
          title:
            "Session expired",
          description:
            "Your login session has expired. Please login again.",
          variant:
            "destructive",
        });

        return;
      }

      session =
        refreshedData.session;

      // ======================================================
      // CALL EDGE FUNCTION
      // ======================================================

      const {
        data,
        error,
      } =
        await supabase.functions.invoke(
          "admin-password",
          {
            body: {
              user_id:
                selectedUser.id,

              password:
                password,
            },
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
          }
        );

      // ======================================================
      // FUNCTION ERROR
      // ======================================================

      if (error) {
        console.error(
          "EDGE FUNCTION ERROR:",
          error
        );

        throw new Error(
          error.message ||
            "Edge Function request failed."
        );
      }

      // ======================================================
      // RESPONSE ERROR
      // ======================================================

      if (
        !data ||
        data.success !== true
      ) {
        throw new Error(
          data?.error ||
            "Password change failed."
        );
      }

      // ======================================================
      // SUCCESS
      // ======================================================

      toast({
        title:
          "Password changed",
        description:
          `Password for ${selectedUser.username} has been changed successfully.`,
      });

      closePasswordDialog();
    } catch (err: any) {
      console.error(
        "CHANGE PASSWORD ERROR:",
        err
      );

      toast({
        title:
          "Failed to change password",
        description:
          err?.message ||
          "Something went wrong.",
        variant:
          "destructive",
      });
    } finally {
      setChangingPassword(false);
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

      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">

        <h1 className="text-2xl font-bold">
          User Management
        </h1>

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
          className="flex items-center mt-4 lg:mt-0"
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

      {/* ====================================================
          FILTER
      ==================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <Search
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(
              e.target.value
            )
          }
          placeholder="Search username or email..."
          className="w-full"
        />

        <Select
          value={roleFilter}
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
          value={statusFilter}
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
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p>{error}</p>
        </div>
      )}

      {/* ====================================================
          EMPTY
      ==================================================== */}

      {!loading &&
        users.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            No users found
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
                  Password
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
                      {u.email || "-"}
                    </TableCell>

                    <TableCell>

                      <span className="capitalize px-2 py-1 bg-gray-100 rounded text-xs">
                        {u.role || "staff"}
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
                        {u.status || "active"}
                      </span>

                    </TableCell>

                    <TableCell>
                      {formatDate(
                        u.created_at
                      )}
                    </TableCell>

                    <TableCell className="text-center">

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          openPasswordDialog(
                            u
                          )
                        }
                      >
                        <KeyRound className="h-4 w-4 mr-2" />

                        Change Password
                      </Button>

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
          CHANGE PASSWORD DIALOG
      ==================================================== */}

      <Dialog
        open={
          passwordDialogOpen
        }
        onOpenChange={(
          open
        ) => {
          if (!open) {
            closePasswordDialog();
          }
        }}
      >

        <DialogContent className="w-full max-w-md">

          <DialogHeader>

            <DialogTitle>
              Change Password
            </DialogTitle>

            <DialogDescription>

              {selectedUser
                ? `Change password for ${selectedUser.username}.`
                : "Change user password."}

            </DialogDescription>

          </DialogHeader>

          <form
            onSubmit={
              handleChangePassword
            }
            className="space-y-4 mt-2"
          >

            {/* =================================================
                USER
            ================================================= */}

            <div>

              <label className="block text-sm font-medium mb-1">
                User
              </label>

              <Input
                value={
                  selectedUser
                    ?.username || ""
                }
                disabled
              />

            </div>

            {/* =================================================
                PASSWORD
            ================================================= */}

            <div>

              <label className="block text-sm font-medium mb-1">
                New Password
              </label>

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
                      e.target.value
                    )
                  }
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  className="pr-10"
                  disabled={
                    changingPassword
                  }
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (value) =>
                        !value
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  disabled={
                    changingPassword
                  }
                >

                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}

                </button>

              </div>

              <p className="text-xs text-gray-500 mt-1">
                Minimum 8 characters.
              </p>

            </div>

            {/* =================================================
                CONFIRM
            ================================================= */}

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
                      e.target.value
                    )
                  }
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  className="pr-10"
                  disabled={
                    changingPassword
                  }
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (value) =>
                        !value
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  disabled={
                    changingPassword
                  }
                >

                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}

                </button>

              </div>

            </div>

            {/* =================================================
                BUTTON
            ================================================= */}

            <div className="flex justify-end gap-3 pt-4">

              <Button
                type="button"
                variant="outline"
                onClick={
                  closePasswordDialog
                }
                disabled={
                  changingPassword
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={
                  changingPassword
                }
              >

                {changingPassword
                  ? "Changing..."
                  : "Change Password"}

              </Button>

            </div>

          </form>

        </DialogContent>

      </Dialog>

    </div>
  );
};

export default User;
