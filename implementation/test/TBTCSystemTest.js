import expectThrow from './helpers/expectThrow'

const BN = require('bn.js')
const utils = require('./utils')
const chai = require('chai')
const expect = chai.expect
const bnChai = require('bn-chai')
chai.use(bnChai(BN))

const TBTCSystem = artifacts.require('TBTCSystem')

const KeepRegistryStub = artifacts.require('KeepRegistryStub')
const ECDSAKeepVendorStub = artifacts.require('ECDSAKeepVendorStub')

const DepositFunding = artifacts.require('DepositFunding')
const DepositLiquidation = artifacts.require('DepositLiquidation')
const DepositRedemption = artifacts.require('DepositRedemption')
const DepositUtils = artifacts.require('DepositUtils')
const DepositStates = artifacts.require('DepositStates')
const TBTCConstants = artifacts.require('TBTCConstants')
const TestDeposit = artifacts.require('TestDeposit')
const DepositFactory = artifacts.require('DepositFactory')

const TEST_DEPOSIT_DEPLOY = [
  { name: 'DepositFunding', contract: DepositFunding },
  { name: 'DepositLiquidation', contract: DepositLiquidation },
  { name: 'DepositRedemption', contract: DepositRedemption },
  { name: 'DepositUtils', contract: DepositUtils },
  { name: 'DepositStates', contract: DepositStates },
  { name: 'TBTCConstants', contract: TBTCConstants },
  { name: 'TestDeposit', contract: TestDeposit },
]

contract('TBTCSystem', (accounts) => {
  let tbtcSystem
  let ecdsaKeepVendor

  describe('requestNewKeep()', async () => {
    before(async () => {
      const deployed = await utils.deploySystem(TEST_DEPOSIT_DEPLOY)

      ecdsaKeepVendor = await ECDSAKeepVendorStub.new()

      const keepRegistry = await KeepRegistryStub.new()
      await keepRegistry.setVendor(ecdsaKeepVendor.address)

      const depositFactory = await DepositFactory.new(deployed.TestDeposit.address)
      tbtcSystem = await TBTCSystem.new(depositFactory.address)

      await tbtcSystem.initialize(
        keepRegistry.address
      )
    })

    it('sends caller as owner to open new keep', async () => {
      const expectedKeepOwner = accounts[2]

      await tbtcSystem.requestNewKeep(5, 10, { from: expectedKeepOwner })
      const keepOwner = await ecdsaKeepVendor.keepOwner.call()

      assert.equal(expectedKeepOwner, keepOwner, 'incorrect keep owner address')
    })

    it('returns keep address', async () => {
      const expectedKeepAddress = await ecdsaKeepVendor.keepAddress.call()

      const result = await tbtcSystem.requestNewKeep.call(5, 10)

      assert.equal(expectedKeepAddress, result, 'incorrect keep address')
    })
  })

  describe('mint()', async () => {
    before(async () => {
      // Create new TBTCSystem instance where only accounts[0] can mint ERC721 tokens
      // accounts[0] is taking the place of deposit factory address
      tbtcSystem = await TBTCSystem.new(accounts[0])
    })

    it('correctly mints 721 token with approved caller', async () => {
      const tokenId = 11111
      const mintTo = accounts[1]

      tbtcSystem.mint(mintTo, tokenId)

      const tokenOwner = await tbtcSystem.ownerOf(tokenId).catch((err) => {
        assert.fail(`Token not minted properly: ${err}`)
      })

      assert.equal(mintTo, tokenOwner, 'Token not minted to correct address')
    })

    it('fails to mint 721 token with bad caller', async () => {
      const tokenId = 22222
      const mintTo = accounts[1]

      await expectThrow(
        tbtcSystem.mint(mintTo, tokenId, { from: accounts[1] }),
        'Caller must be depositFactory contract'
      )
    })
  })

  describe('setSignerFeeDivisor', async () => {
    it('sets the signer fee', async () => {
      await tbtcSystem.setSignerFeeDivisor(new BN('201'))

      const signerFeeDivisor = await tbtcSystem.getSignerFeeDivisor()
      expect(signerFeeDivisor).to.eq.BN(new BN('201'))
    })

    it('reverts if msg.sender != owner', async () => {
      await expectThrow(
        tbtcSystem.setSignerFeeDivisor(new BN('201'), { from: accounts[1] }),
        ''
      )
    })
  })

  describe('setAllowNewDeposits', async () => {
    it('sets allowNewDeposits', async () => {
      await tbtcSystem.setAllowNewDeposits(false)

      const allowNewDeposits = await tbtcSystem.getAllowNewDeposits()
      expect(allowNewDeposits).to.equal(false)
    })

    it('reverts if msg.sender != owner', async () => {
      await expectThrow(
        tbtcSystem.setAllowNewDeposits(false, { from: accounts[1] }),
        ''
      )
    })
  })
})
