export type RequestUser = {
  sub: string;
  email: string | null;
  role: string;
  roles: string[];
};
