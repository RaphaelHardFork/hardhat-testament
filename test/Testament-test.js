/* eslint-disable comma-dangle */
/* eslint-disable no-undef */
const { expect } = require('chai')

describe('Testament', () => {
  let dev, owner, doctor, nextDoctor, recipient1, recipient2, Testament, testament
  const ZERO_ADDRESS = ethers.constants.AddressZero
  const BASIC_BEQUEATH = ethers.utils.parseEther('5')

  beforeEach(async function () {
    ;[dev, owner, doctor, nextDoctor, recipient1, recipient2] = await ethers.getSigners()
    Testament = await ethers.getContractFactory('Testament')
    testament = await Testament.connect(dev).deploy(owner.address, doctor.address)
    await testament.deployed
  })

  describe('Deployment', function () {
    it('should set owner and doctor address', async function () {
      expect(await testament.owner()).to.equal(owner.address)
      expect(await testament.doctor()).to.equal(doctor.address)
    })

    it('should emit a DoctorChanged event', async function () {
      await expect(testament.deployTransaction).to.emit(testament, 'DoctorChanged').withArgs(doctor.address)
    })

    it('should revert if owner is the doctor', async function () {
      await expect(Testament.connect(dev).deploy(owner.address, owner.address)).to.be.revertedWith(
        'Testament: You cannot define the owner and the doctor as the same person.'
      )
    })
  })

  describe('Bequeath', function () {
    let bequeath
    let ownerBalance
    beforeEach(async function () {
      ownerBalance = await owner.getBalance()
      bequeath = await testament.connect(owner).bequeath(recipient1.address, { value: BASIC_BEQUEATH, gasPrice: 0 })
    })

    it('should emit a Bequeath event', async function () {
      await expect(bequeath).to.emit(testament, 'Bequeath').withArgs(recipient1.address, BASIC_BEQUEATH)
    })

    it('should increase legacy balances of recipient', async function () {
      expect(await testament.legacyOf(recipient1.address)).to.equal(BASIC_BEQUEATH)
    })

    // sans la fonction changeEther
    it('should decrease balance of owner', async function () {
      expect(await owner.getBalance()).to.equal(ownerBalance.sub(BASIC_BEQUEATH))
    })

    // Avec la fonction changeEther
    it('should decrease balance of owner', async function () {
      expect(bequeath).to.changeEtherBalance(owner, BASIC_BEQUEATH.sub(BASIC_BEQUEATH.mul(2))) // = Number - (2xNumber)
    })

    it('should revert if zero address is choosen', async function () {
      await expect(testament.connect(owner).bequeath(ZERO_ADDRESS, { value: BASIC_BEQUEATH })).to.be.revertedWith(
        'Testament: you cannot bequeath to zero address.'
      )
    })

    it('should revert if another address than owner call this function (modifier)', async function () {
      await expect(
        testament.connect(recipient2).bequeath(recipient1.address, { value: BASIC_BEQUEATH })
      ).to.be.revertedWith('Testament: You are not allowed to use this function.')
    })
  })

  describe('setDoctor', function () {
    let changeDoctor
    beforeEach(async function () {
      changeDoctor = await testament.connect(owner).setDoctor(nextDoctor.address)
    })

    it('should emit a DoctorChanged event', async function () {
      expect(changeDoctor).to.emit(testament, 'DoctorChanged').withArgs(nextDoctor.address)
    })

    it('should change the doctor', async function () {
      expect(await testament.doctor()).to.equal(nextDoctor.address)
    })

    it('should revert if the owner is set to the doctor', async function () {
      await expect(testament.connect(owner).setDoctor(owner.address)).to.be.revertedWith(
        'Testament: You cannot be set as doctor.'
      )
    })

    it('should revert if another address than owner call this function (modifier)', async function () {
      await expect(testament.connect(doctor).setDoctor(recipient2.address)).to.be.revertedWith(
        'Testament: You are not allowed to use this function.'
      )
    })
  })

  describe('contractEnd', function () {
    let contractEnded
    beforeEach(async function () {
      contractEnded = await testament.connect(doctor).contractEnd()
    })

    it('should emit a ContractEnded event', async function () {
      expect(contractEnded).to.emit(testament, 'ContractEnded').withArgs(doctor.address)
    })

    it('should change the state of isContractOver', async function () {
      expect(await testament.isContractOver()).to.equal(true)
    })

    it('should revert if it is not the doctor (modifier)', async function () {
      await expect(testament.connect(recipient2).contractEnd()).to.be.revertedWith(
        'Testament: You are not allowed to use this function.'
      )
    })

    it('should revert if contract is already ended', async function () {
      await expect(testament.connect(doctor).contractEnd()).to.be.revertedWith(
        'Testament: The contract is already over.'
      )
    })
  })

  describe('Withdraw', function () {
    let withdrawTransaction
    beforeEach(async function () {
      await testament.connect(owner).bequeath(recipient1.address, { value: BASIC_BEQUEATH })
      await testament.connect(doctor).contractEnd()
      withdrawTransaction = await testament.connect(recipient1).withdraw()
    })

    it('should emit a LegacyWithdrew event', async function () {
      expect(withdrawTransaction).to.emit(testament, 'LegacyWithdrew').withArgs(recipient1.address, BASIC_BEQUEATH)
    })

    it('should decrease legacy balance', async function () {
      expect(await testament.legacyOf(recipient1.address)).to.equal(0)
    })

    it('should increase balance of the recipient1', async function () {
      expect(withdrawTransaction).to.changeEtherBalance(recipient1, BASIC_BEQUEATH)
    })

    it('should revert if the legacy balance is empty', async function () {
      await expect(testament.connect(recipient2).withdraw()).to.be.revertedWith(
        'Testament: You do not have any legacy on this contract.'
      )
    })
  })

  describe('Misuse of the contract', function () {
    it('should revert if a withdraw is called before contract end (modifier)', async function () {
      await testament.connect(owner).bequeath(recipient1.address, { value: BASIC_BEQUEATH })
      await expect(testament.connect(recipient1).withdraw()).to.be.revertedWith(
        'Testament: The contract has not yet over.'
      )
    })
  })
})
