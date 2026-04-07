**FREE
// =============================================================================
// Program  : ORDPROC
// Purpose  : Order Processing Program - Validates and processes customer orders
// Author   : Sample Program for RPGLE AI Assistant Testing
// Date     : 2024-01-15
// =============================================================================

Ctl-Opt DftActGrp(*No) ActGrp('ORDPROC') Option(*SrcStmt: *NoDebugIO);

// File Declarations
DCL-F ORDHDR  Usage(*Input: *Update) Keyed;     // Order Header file
DCL-F ORDDET  Usage(*Input)          Keyed;     // Order Detail file
DCL-F CUSTMST Usage(*Input)          Keyed;     // Customer Master file
DCL-F ITMMST  Usage(*Input)          Keyed;     // Item Master file
DCL-F INVHDR  Usage(*Output)         Keyed;     // Invoice Header output
DCL-F ERRLOG  Usage(*Output);                   // Error log file

// Standalone variables
DCL-S WS_OrderNo     Packed(9:0);
DCL-S WS_CustNo      Char(10);
DCL-S WS_TotalAmt    Packed(13:2);
DCL-S WS_TaxAmt      Packed(13:2);
DCL-S WS_InvNo       Packed(9:0);
DCL-S WS_ErrorMsg    Char(100);
DCL-S WS_Valid       Ind;
DCL-S WS_TaxRate     Packed(5:4);

// Constants
DCL-C DEFAULT_TAX_RATE  0.0825;  // 8.25% tax rate
DCL-C MAX_ORDER_AMT     99999.99;
DCL-C STATUS_PENDING    'P';
DCL-C STATUS_PROCESSED  'X';
DCL-C STATUS_ERROR      'E';

// Data structures
DCL-DS DS_OrderKey;
  DSK_OrderNo  Packed(9:0);
  DSK_LineNo   Packed(3:0);
End-DS;

// Prototype for SendEmail subprocedure
DCL-PR SendEmailAlert ExtPgm('SNDEMAIL');
  PR_Recipient  Char(100);
  PR_Subject    Char(100);
  PR_Message    Char(500);
End-PR;


// =============================================================================
// MAIN PROCEDURE
// =============================================================================
/FREE

  // Initialize
  WS_TotalAmt = 0;
  WS_TaxAmt   = 0;
  WS_Valid    = *On;

  // Read all pending orders and process them
  SetLL STATUS_PENDING ORDHDR;
  Read ORDHDR;

  DoW Not %EOF(ORDHDR) And WS_Valid;

    WS_OrderNo = ORD_ORDNO;
    WS_CustNo  = ORD_CUSTNO;

    // Step 1: Validate customer exists
    If Not ValidateCustomer(WS_CustNo);
      WS_ErrorMsg = 'Customer not found: ' + %Trim(WS_CustNo);
      WriteErrorLog(WS_OrderNo: WS_ErrorMsg);
      ORD_STATUS = STATUS_ERROR;
      Update ORDHDRR;
      Read ORDHDR;
      Iter;
    EndIf;

    // Step 2: Calculate order total from detail lines
    WS_TotalAmt = CalcOrderTotal(WS_OrderNo);

    // Step 3: Check order amount limit
    If WS_TotalAmt > MAX_ORDER_AMT;
      WS_ErrorMsg = 'Order exceeds maximum amount: ' + %Char(WS_TotalAmt);
      WriteErrorLog(WS_OrderNo: WS_ErrorMsg);
      ORD_STATUS = STATUS_ERROR;
      Update ORDHDRR;
      Read ORDHDR;
      Iter;
    EndIf;

    // Step 4: Apply tax
    WS_TaxRate  = GetTaxRate(CUST_STATE);
    WS_TaxAmt   = WS_TotalAmt * WS_TaxRate;
    WS_TotalAmt = WS_TotalAmt + WS_TaxAmt;

    // Step 5: Write invoice
    WS_InvNo = GenerateInvoiceNo();
    WriteInvoice(WS_InvNo: WS_OrderNo: WS_TotalAmt: WS_TaxAmt);

    // Step 6: Mark order as processed
    ORD_STATUS  = STATUS_PROCESSED;
    ORD_INVNO   = WS_InvNo;
    ORD_PROCDT  = %Date();
    Update ORDHDRR;

    Read ORDHDR;
  EndDo;

  *InLR = *On;
  Return;


// =============================================================================
// SUBPROCEDURE: ValidateCustomer
// Purpose: Checks that a customer exists and is active in CUSTMST
// =============================================================================
DCL-Proc ValidateCustomer;
  DCL-PI ValidateCustomer Ind;
    PI_CustNo  Char(10) Const;
  End-PI;

  Chain PI_CustNo CUSTMST;
  If %Found(CUSTMST);
    If CUST_STATUS = 'A';
      Return *On;
    EndIf;
  EndIf;

  Return *Off;
End-Proc ValidateCustomer;


// =============================================================================
// SUBPROCEDURE: CalcOrderTotal
// Purpose: Sums all detail line amounts for a given order number
// =============================================================================
DCL-Proc CalcOrderTotal;
  DCL-PI CalcOrderTotal Packed(13:2);
    PI_OrderNo  Packed(9:0) Const;
  End-PI;

  DCL-S LS_Total   Packed(13:2) Inz(0);
  DCL-S LS_LineAmt Packed(13:2);

  DSK_OrderNo = PI_OrderNo;
  DSK_LineNo  = 0;

  SetLL DS_OrderKey ORDDET;
  ReadE PI_OrderNo ORDDET;

  DoW Not %EOF(ORDDET);
    // Qty * Unit Price = Line Amount
    LS_LineAmt = DET_QTY * DET_UPRICE;

    // Check item is still valid
    Chain DET_ITEMNO ITMMST;
    If Not %Found(ITMMST);
      // Item discontinued - use zero price and log warning
      WS_ErrorMsg = 'Item not found: ' + %Trim(DET_ITEMNO);
      WriteErrorLog(PI_OrderNo: WS_ErrorMsg);
      LS_LineAmt = 0;
    EndIf;

    LS_Total += LS_LineAmt;
    ReadE PI_OrderNo ORDDET;
  EndDo;

  Return LS_Total;
End-Proc CalcOrderTotal;


// =============================================================================
// SUBPROCEDURE: GetTaxRate
// Purpose: Returns applicable tax rate based on state code
// =============================================================================
DCL-Proc GetTaxRate;
  DCL-PI GetTaxRate Packed(5:4);
    PI_State  Char(2) Const;
  End-PI;

  Select;
    When PI_State = 'TX'; Return 0.0825;
    When PI_State = 'CA'; Return 0.0975;
    When PI_State = 'NY'; Return 0.0880;
    When PI_State = 'FL'; Return 0.0700;
    Other;                Return DEFAULT_TAX_RATE;
  EndSl;
End-Proc GetTaxRate;


// =============================================================================
// SUBPROCEDURE: GenerateInvoiceNo
// Purpose: Generates a new sequential invoice number
// =============================================================================
DCL-Proc GenerateInvoiceNo;
  DCL-PI GenerateInvoiceNo Packed(9:0);
  End-PI;

  DCL-S LS_InvNo  Packed(9:0);

  // Read last invoice number from control file and increment
  // (Simplified - in production use a data area or sequence object)
  LS_InvNo = %Date() * 1000 + %Seconds();
  Return LS_InvNo;
End-Proc GenerateInvoiceNo;


// =============================================================================
// SUBPROCEDURE: WriteInvoice
// Purpose: Writes a new invoice header record to INVHDR
// =============================================================================
DCL-Proc WriteInvoice;
  DCL-PI WriteInvoice;
    PI_InvNo    Packed(9:0) Const;
    PI_OrderNo  Packed(9:0) Const;
    PI_Total    Packed(13:2) Const;
    PI_Tax      Packed(13:2) Const;
  End-PI;

  Clear INVHDRF;
  INV_INVNO   = PI_InvNo;
  INV_ORDNO   = PI_OrderNo;
  INV_TOTAL   = PI_Total;
  INV_TAX     = PI_Tax;
  INV_DATE    = %Date();
  INV_TIME    = %Time();
  Write INVHDRF;

End-Proc WriteInvoice;


// =============================================================================
// SUBPROCEDURE: WriteErrorLog
// Purpose: Logs an error message to the ERRLOG file
// =============================================================================
DCL-Proc WriteErrorLog;
  DCL-PI WriteErrorLog;
    PI_OrderNo  Packed(9:0) Const;
    PI_Msg      Char(100) Const;
  End-PI;

  Clear ERRF;
  ERR_ORDNO   = PI_OrderNo;
  ERR_MSG     = PI_Msg;
  ERR_DATE    = %Date();
  ERR_TIME    = %Time();
  ERR_USER    = %Char(%JobName());
  Write ERRF;

  // Also send an alert email for critical errors
  SendEmailAlert(
    'erp-alerts@company.com':
    'Order Processing Error - Order ' + %Char(PI_OrderNo):
    PI_Msg
  );

End-Proc WriteErrorLog;
