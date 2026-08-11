import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

interface RequestBody {
  action: "create" | "update" | "delete";

  user_id?: string;

  username?: string;
  email?: string;
  password?: string;

  role?: string;
  status?: string;
}

const jsonResponse = (
  body: Record<string, unknown>,
  status = 200
) => {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
};

Deno.serve(async (req) => {
  // =========================================================
  // CORS
  // =========================================================

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  // =========================================================
  // ONLY POST
  // =========================================================

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Only POST requests are allowed.",
      },
      405
    );
  }

  try {
    // =======================================================
    // ENV
    // =======================================================

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl) {
      return jsonResponse(
        {
          success: false,
          error: "SUPABASE_URL is missing.",
        },
        500
      );
    }

    if (!serviceRoleKey) {
      return jsonResponse(
        {
          success: false,
          error:
            "SUPABASE_SERVICE_ROLE_KEY is missing.",
        },
        500
      );
    }

    // =======================================================
    // ADMIN CLIENT
    // =======================================================

    const admin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // =======================================================
    // AUTH HEADER
    // =======================================================

    const authHeader =
      req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse(
        {
          success: false,
          error:
            "Authorization header is required.",
        },
        401
      );
    }

    if (
      !authHeader
        .toLowerCase()
        .startsWith("bearer ")
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid Authorization header format.",
        },
        401
      );
    }

    const token =
      authHeader
        .substring(7)
        .trim();

    if (!token) {
      return jsonResponse(
        {
          success: false,
          error:
            "Authentication token is missing.",
        },
        401
      );
    }

    // =======================================================
    // VERIFY LOGIN
    // =======================================================

    const {
      data: userData,
      error: authError,
    } =
      await admin.auth.getUser(token);

    if (authError) {
      console.error(
        "AUTH VERIFY ERROR:",
        authError
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Invalid or expired authentication token.",
          details:
            authError.message,
        },
        401
      );
    }

    const currentUser =
      userData?.user;

    if (!currentUser) {
      return jsonResponse(
        {
          success: false,
          error:
            "Authenticated user not found.",
        },
        401
      );
    }

    console.log(
      "CURRENT AUTH USER:",
      currentUser.id,
      currentUser.email
    );

    // =======================================================
    // GET CURRENT PROFILE
    // =======================================================

    const {
      data: currentProfile,
      error: currentProfileError,
    } =
      await admin
        .from("users")
        .select(
          "id, username, email, role, status"
        )
        .eq(
          "id",
          currentUser.id
        )
        .maybeSingle();

    if (currentProfileError) {
      console.error(
        "CURRENT PROFILE ERROR:",
        currentProfileError
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Failed to load current user profile.",
          details:
            currentProfileError.message,
        },
        500
      );
    }

    if (!currentProfile) {
      return jsonResponse(
        {
          success: false,
          error:
            "Your user profile was not found.",
        },
        403
      );
    }

    console.log(
      "CURRENT PROFILE:",
      JSON.stringify(
        currentProfile
      )
    );

    // =======================================================
    // CHECK ADMIN
    // =======================================================

    if (
      currentProfile.role !==
      "admin"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Only admin can manage users.",
          current_role:
            currentProfile.role,
        },
        403
      );
    }

    // =======================================================
    // CHECK ACTIVE
    // =======================================================

    if (
      currentProfile.status !==
      "active"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Your account is inactive.",
        },
        403
      );
    }

    // =======================================================
    // READ BODY
    // =======================================================

    let body: RequestBody;

    try {
      body =
        (await req.json()) as RequestBody;
    } catch {
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid JSON request body.",
        },
        400
      );
    }

    const {
      action,
      user_id,
      username,
      email,
      password,
      role,
      status,
    } = body;

    console.log(
      "ADMIN ACTION:",
      action
    );

    // =======================================================
    // VALIDATE ACTION
    // =======================================================

    if (
      action !== "create" &&
      action !== "update" &&
      action !== "delete"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid action.",
        },
        400
      );
    }

    // =======================================================
    // ALLOWED VALUES
    // =======================================================

    const allowedRoles = [
      "admin",
      "manager",
      "staff",
    ];

    const allowedStatus = [
      "active",
      "inactive",
    ];

    // =======================================================
    // CREATE
    // =======================================================

    if (action === "create") {
      const cleanUsername =
        username?.trim();

      const cleanEmail =
        email
          ?.trim()
          .toLowerCase();

      if (
        !cleanUsername ||
        !cleanEmail ||
        !password
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Username, email and password are required.",
          },
          400
        );
      }

      if (password.length < 8) {
        return jsonResponse(
          {
            success: false,
            error:
              "Password must contain at least 8 characters.",
          },
          400
        );
      }

      const finalRole =
        role || "staff";

      const finalStatus =
        status || "active";

      if (
        !allowedRoles.includes(
          finalRole
        )
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Invalid role.",
          },
          400
        );
      }

      if (
        !allowedStatus.includes(
          finalStatus
        )
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Invalid status.",
          },
          400
        );
      }

      // =====================================================
      // CREATE AUTH USER
      // =====================================================

      const {
        data: authData,
        error: authCreateError,
      } =
        await admin.auth.admin.createUser(
          {
            email: cleanEmail,
            password,
            email_confirm: true,
            user_metadata: {
              username:
                cleanUsername,
            },
          }
        );

      if (
        authCreateError ||
        !authData?.user
      ) {
        console.error(
          "AUTH CREATE ERROR:",
          authCreateError
        );

        return jsonResponse(
          {
            success: false,
            error:
              authCreateError?.message ||
              "Failed to create authentication user.",
          },
          400
        );
      }

      const newUser =
        authData.user;

      // =====================================================
      // CREATE PROFILE
      // =====================================================

      const {
        error: profileError,
      } =
        await admin
          .from("users")
          .insert({
            id: newUser.id,
            username:
              cleanUsername,
            email:
              cleanEmail,
            role:
              finalRole,
            status:
              finalStatus,
          });

      if (profileError) {
        console.error(
          "PROFILE CREATE ERROR:",
          profileError
        );

        // Rollback auth
        await admin.auth.admin.deleteUser(
          newUser.id
        );

        return jsonResponse(
          {
            success: false,
            error:
              profileError.message,
          },
          400
        );
      }

      return jsonResponse({
        success: true,
        message:
          "User created successfully.",
        user_id:
          newUser.id,
      });
    }

    // =======================================================
    // UPDATE
    // =======================================================

    if (action === "update") {
      if (!user_id) {
        return jsonResponse(
          {
            success: false,
            error:
              "User ID is required.",
          },
          400
        );
      }

      // =====================================================
      // GET TARGET
      // =====================================================

      const {
        data: targetUser,
        error: targetError,
      } =
        await admin
          .from("users")
          .select(
            "id, username, email, role, status"
          )
          .eq(
            "id",
            user_id
          )
          .maybeSingle();

      if (targetError) {
        console.error(
          "TARGET USER ERROR:",
          targetError
        );

        return jsonResponse(
          {
            success: false,
            error:
              targetError.message,
          },
          500
        );
      }

      if (!targetUser) {
        return jsonResponse(
          {
            success: false,
            error:
              "User not found.",
          },
          404
        );
      }

      // =====================================================
      // SELF ROLE PROTECTION
      // =====================================================

      if (
        user_id ===
          currentUser.id &&
        role !== undefined &&
        role !== "admin"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "You cannot remove your own admin role.",
          },
          403
        );
      }

      // =====================================================
      // SELF STATUS PROTECTION
      // =====================================================

      if (
        user_id ===
          currentUser.id &&
        status !== undefined &&
        status !== "active"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "You cannot deactivate your own account.",
          },
          403
        );
      }

      // =====================================================
      // VALIDATE ROLE
      // =====================================================

      if (
        role !== undefined &&
        !allowedRoles.includes(
          role
        )
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Invalid role.",
          },
          400
        );
      }

      // =====================================================
      // VALIDATE STATUS
      // =====================================================

      if (
        status !== undefined &&
        !allowedStatus.includes(
          status
        )
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Invalid status.",
          },
          400
        );
      }

      // =====================================================
      // CLEAN VALUES
      // =====================================================

      const cleanUsername =
        username !== undefined
          ? username.trim()
          : undefined;

      const cleanEmail =
        email !== undefined
          ? email
              .trim()
              .toLowerCase()
          : undefined;

      if (
        username !== undefined &&
        !cleanUsername
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Username cannot be empty.",
          },
          400
        );
      }

      if (
        email !== undefined &&
        !cleanEmail
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Email cannot be empty.",
          },
          400
        );
      }

      // =====================================================
      // UPDATE AUTH EMAIL
      // =====================================================

      if (
        cleanEmail &&
        cleanEmail !==
          (
            targetUser.email ||
            ""
          )
            .trim()
            .toLowerCase()
      ) {
        const {
          error: emailError,
        } =
          await admin.auth.admin.updateUserById(
            user_id,
            {
              email:
                cleanEmail,
              email_confirm:
                true,
            }
          );

        if (emailError) {
          console.error(
            "AUTH EMAIL UPDATE ERROR:",
            emailError
          );

          return jsonResponse(
            {
              success: false,
              error:
                emailError.message,
            },
            400
          );
        }
      }

      // =====================================================
      // UPDATE PASSWORD
      // =====================================================

      let passwordChanged =
        false;

      if (
        password !== undefined &&
        password !== ""
      ) {
        if (
          password.length < 8
        ) {
          return jsonResponse(
            {
              success: false,
              error:
                "Password must contain at least 8 characters.",
            },
            400
          );
        }

        const {
          error: passwordError,
        } =
          await admin.auth.admin.updateUserById(
            user_id,
            {
              password,
            }
          );

        if (passwordError) {
          console.error(
            "AUTH PASSWORD UPDATE ERROR:",
            passwordError
          );

          return jsonResponse(
            {
              success: false,
              error:
                passwordError.message,
            },
            400
          );
        }

        passwordChanged = true;
      }

      // =====================================================
      // UPDATE PROFILE
      // =====================================================

      const updateData:
        Record<
          string,
          unknown
        > = {};

      if (
        cleanUsername !==
        undefined
      ) {
        updateData.username =
          cleanUsername;
      }

      if (
        cleanEmail !==
        undefined
      ) {
        updateData.email =
          cleanEmail;
      }

      if (
        role !== undefined
      ) {
        updateData.role =
          role;
      }

      if (
        status !== undefined
      ) {
        updateData.status =
          status;
      }

      if (
        Object.keys(
          updateData
        ).length > 0
      ) {
        const {
          error: updateError,
        } =
          await admin
            .from("users")
            .update(
              updateData
            )
            .eq(
              "id",
              user_id
            );

        if (updateError) {
          console.error(
            "PROFILE UPDATE ERROR:",
            updateError
          );

          return jsonResponse(
            {
              success: false,
              error:
                updateError.message,
            },
            400
          );
        }
      }

      return jsonResponse({
        success: true,
        message:
          passwordChanged
            ? "User and password updated successfully."
            : "User updated successfully.",
        password_changed:
          passwordChanged,
        updated_user_id:
          user_id,
      });
    }

    // =======================================================
    // DELETE
    // =======================================================

    if (action === "delete") {
      if (!user_id) {
        return jsonResponse(
          {
            success: false,
            error:
              "User ID is required.",
          },
          400
        );
      }

      // =====================================================
      // PREVENT SELF DELETE
      // =====================================================

      if (
        user_id ===
        currentUser.id
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "You cannot delete your own account.",
          },
          403
        );
      }

      // =====================================================
      // CHECK TARGET
      // =====================================================

      const {
        data: targetUser,
        error: targetError,
      } =
        await admin
          .from("users")
          .select("id")
          .eq(
            "id",
            user_id
          )
          .maybeSingle();

      if (targetError) {
        return jsonResponse(
          {
            success: false,
            error:
              targetError.message,
          },
          500
        );
      }

      if (!targetUser) {
        return jsonResponse(
          {
            success: false,
            error:
              "User not found.",
          },
          404
        );
      }

      // =====================================================
      // DELETE AUTH
      // =====================================================

      const {
        error: authDeleteError,
      } =
        await admin.auth.admin.deleteUser(
          user_id
        );

      if (authDeleteError) {
        console.error(
          "AUTH DELETE ERROR:",
          authDeleteError
        );

        return jsonResponse(
          {
            success: false,
            error:
              authDeleteError.message,
          },
          400
        );
      }

      // =====================================================
      // DELETE PROFILE
      // =====================================================

      const {
        error:
          profileDeleteError,
      } =
        await admin
          .from("users")
          .delete()
          .eq(
            "id",
            user_id
          );

      if (
        profileDeleteError
      ) {
        console.error(
          "PROFILE DELETE ERROR:",
          profileDeleteError
        );

        return jsonResponse(
          {
            success: false,
            error:
              profileDeleteError.message,
          },
          400
        );
      }

      return jsonResponse({
        success: true,
        message:
          "User deleted successfully.",
      });
    }

    return jsonResponse(
      {
        success: false,
        error:
          "Unknown operation.",
      },
      400
    );
  } catch (error) {
    console.error(
      "ADMIN USER UNHANDLED ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Internal server error.",
      },
      500
    );
  }
});
