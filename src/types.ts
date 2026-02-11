// API Response Types based on actual JSON response analysis

export interface BidItem {
  bidNtceNo: string; // Bid Notice Number
  bidNtceOrd: string; // Bid Notice Order
  bidNtceNm: string; // Bid Notice Name
  bidNtceDt: string; // Bid Notice Date (YYYYMMDDHHMM format for sorting)
  ntceInsttNm: string; // Notifying Institution Name
  dminsttNm: string; // Demand Institution Name (Mapped from dmndInsttNm)
  bidNtceBgnDt: string; // Bid Notice Begin Date
  bidNtceEndDt: string; // Bid Notice End Date
  prtcptPsblRgnNm: string; // Participation Possible Region Name
  bidprcPsblIndstrytyNm: string; // Biddable Industry Type Name
  bidNtceUrl: string; // Bid Notice URL
  bidNtceSttusNm: string; // Status
  bsnsDivNm: string; // Business Division
  presmptPrce?: string; // Presumed Price
  
  // Optional fields that might be present in raw data
  bidNtceDate?: string; 
  bidNtceBgn?: string;
  dmndInsttNm?: string;
}

export interface ApiResponseHeader {
  resultCode: string;
  resultMsg: string;
}

export interface ApiResponseBody {
  items: any; 
  numOfRows: number;
  pageNo: number;
  totalCount: number;
}

export interface ApiResponse {
  response: {
    header: ApiResponseHeader;
    body: ApiResponseBody;
  };
}

export interface FilterState {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  keyword: string;
}