export interface HttpResponse<ResponseType> {
  success: true;
  status: number;
  data: ResponseType;
}

export interface HttpErrorResponse<ResponseType> {
  success: false;
  status: number;
  data: ResponseType;
}

export class HttpError<ResponseType> extends Error {
  public response: HttpErrorResponse<ResponseType>;
  public success: false;
  public status: number;
  public data: ResponseType;

  constructor(message: string, response: HttpErrorResponse<ResponseType>) {
    super(message);

    this.response = response;
    const { success, status, data } = response;
    this.success = success;
    this.status = status;
    this.data = data;
  }
}
