use soroban_sdk::{contracttype, contracterror, Address};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum RoscaError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    PoolFull = 3,
    AlreadyMember = 4,
    NotMember = 5,
    WrongState = 6,
    AlreadyContributed = 7,
    RoundNotComplete = 8,
    RoundNotElapsed = 9,
    NotAdmin = 10,
    FeeTooHigh = 11,
    InsufficientBalance = 12,
    MemberLimitExceeded = 13,
    InvalidParam = 14,
    Overflow = 15,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RoscaState {
    Setup,
    Active,
    Completed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoscaConfig {
    pub contribution_amount: i128,
    pub round_period: u64,
    pub start_time: u64,
    pub max_members: u32,
    pub manager_fee_bps: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MemberStatus {
    pub contributed_this_round: bool,
    pub has_received_payout: bool,
    pub total_contributed: i128,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    Config,
    State,
    CurrentRound,
    Members,
    Manager,
    ContribCount,       // instance: contributions recorded in current round
    TotalManagerFees,   // instance: cumulative manager fees paid out
    MemberPosition(Address),  // persistent: member address -> slot index (O(1) lookup)
    RoundDeposit(u32, Address),
    HasReceived(Address),
    TotalContributed(Address),
    RoundRecipient(u32),
    ManagerFeePaid(u32),
}
