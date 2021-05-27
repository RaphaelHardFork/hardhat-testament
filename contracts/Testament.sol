// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";

contract Testament {
    using Address for address payable;
    // storage
    address private _owner;
    address private _doctor;
    bool private _contractEnd;
    mapping(address => uint256) private _legacy;

    //event
    event Bequeath(address indexed account, uint256 amount);
    event DoctorChanged(address indexed doctor);
    event ContractEnded(address doctor);
    event LegacyWithdrew(address indexed account, uint256 amount);

    constructor(address owner_, address doctor_) {
        require(owner_ != doctor_, "Testament: You cannot define the owner and the doctor as the same person.");
        _owner = owner_;
        _doctor = doctor_;
        emit DoctorChanged(doctor_);
    }

    // modifier
    modifier onlyOwner() {
        require(msg.sender == _owner, "Testament: You are not allowed to use this function.");
        _;
    }

    modifier onlyDoctor() {
        require(msg.sender == _doctor, "Testament: You are not allowed to use this function.");
        _;
    }

    modifier contractOver() {
        require(_contractEnd == true, "Testament: The contract has not yet over.");
        _;
    }

    // functions
    function bequeath(address account) external payable onlyOwner {
        require(account != address(0), "Testament: you cannot bequeath to zero address.");
        _legacy[account] += msg.value;
        emit Bequeath(account, msg.value);
    }

    function setDoctor(address account) public onlyOwner {
        require(msg.sender != account, "Testament: You cannot be set as doctor.");
        _doctor = account;
        emit DoctorChanged(account);
    }

    function contractEnd() public onlyDoctor {
        require(_contractEnd == false, "Testament: The contract is already over.");
        _contractEnd = true;
        emit ContractEnded(msg.sender);
    }

    function withdraw() public contractOver {
        require(_legacy[msg.sender] != 0, "Testament: You do not have any legacy on this contract.");
        uint256 amount = _legacy[msg.sender];
        _legacy[msg.sender] = 0;
        payable(msg.sender).sendValue(amount);
        emit LegacyWithdrew(msg.sender, amount);
    }

    function legacyOf(address account) public view returns (uint256) {
        return _legacy[account];
    }

    function doctor() public view returns (address) {
        return _doctor;
    }

    function owner() public view returns (address) {
        return _owner;
    }

    function isContractOver() public view returns (bool) {
        return _contractEnd;
    }
}
