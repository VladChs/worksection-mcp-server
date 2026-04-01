// Worksection API response types

export interface WorksectionUser {
  id: string;
  email: string;
  name: string;
}

export interface WorksectionProject {
  id: string;
  name: string;
  page: string;
  status: "active" | "pending" | "archived";
  company?: string;
  user_from: WorksectionUser;
  user_to: WorksectionUser;
  text?: string;
  date_added: string;
  date_start?: string;
  date_end?: string;
  date_closed?: string;
  max_time?: string;
  max_money?: string;
  tags?: Record<string, string>;
  users?: WorksectionUser[];
  options?: Record<string, number>;
}

export interface WorksectionFile {
  id: string;
  size: string;
  name: string;
  page: string;
}

export interface WorksectionRelation {
  type: "finish-to-start" | "start-to-start";
  task: {
    id: string;
    name: string;
    page: string;
    status: string;
    priority: string;
  };
}

export interface WorksectionTask {
  id: string;
  name: string;
  page: string;
  status: "active" | "done";
  priority: string;
  user_from: WorksectionUser;
  user_to: WorksectionUser;
  project: {
    id: string;
    name: string;
    page: string;
  };
  text?: string;
  date_added: string;
  date_start?: string;
  date_end?: string;
  date_closed?: string;
  time_end?: string;
  max_time?: string;
  max_money?: string;
  tags?: Record<string, string>;
  files?: WorksectionFile[];
  relations?: {
    to: WorksectionRelation[];
    from: WorksectionRelation[];
  };
  child?: WorksectionTask[];
}

export interface WorksectionComment {
  id: string;
  page: string;
  text: string;
  date_added: string;
  user_from: WorksectionUser;
  files?: WorksectionFile[];
  todo?: Array<{
    id: string;
    text: string;
    checked: boolean;
  }>;
}

export interface WorksectionApiResponse<T> {
  status: "ok" | "error";
  data: T;
}

export interface WorksectionErrorResponse {
  status: "error";
  data: string;
}

export interface WorksectionProjectGroup {
  id: string;
  name: string;
}

export interface WorksectionMember {
  id: string;
  email: string;
  name: string;
  is_online?: string;
  role?: string;
}

export interface WorksectionTag {
  id: string;
  name: string;
}
