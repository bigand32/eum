export function formatSignupError(error: unknown): string {
  if (error instanceof Error) {
    switch (error.message) {
      case "ALREADY_EXISTS":
        return "이미 가입된 이메일이에요.";
      case "EMAIL_NOT_CONFIRMED":
        return "이메일 인증이 필요해요. 메일함을 확인해 주세요.";
      case "MASTER_PROFILE_REQUIRED":
        return "강사 프로필 정보가 필요해요.";
      case "SIGNUP_FAILED":
        return "회원가입에 실패했어요. 다시 시도해 주세요.";
      default:
        if (error.message.toLowerCase().includes("already registered")) {
          return "이미 가입된 이메일이에요.";
        }
        if (error.message.toLowerCase().includes("email not confirmed")) {
          return "이메일 인증이 필요해요. 메일함을 확인해 주세요.";
        }
        if (error.message.includes("duplicate key") || error.message.includes("23505")) {
          return "이미 가입된 이메일이에요.";
        }
        if (error.message.includes("infinite recursion")) {
          return "회원가입 설정 오류가 있어요. 잠시 후 다시 시도해 주세요.";
        }
        return error.message || "회원가입에 실패했어요. 다시 시도해 주세요.";
    }
  }
  return "회원가입에 실패했어요. 다시 시도해 주세요.";
}
