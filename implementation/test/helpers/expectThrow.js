export default async (promise, expectedErrorMessage) => {
  try {
    await promise
  } catch (error) {
    // TODO: Check jump destination to destinguish between a throw
    //       and an actual invalid jump.
    const invalidOpcode = error.message.search('invalid opcode') >= 0
    // TODO: When we contract A calls contract B, and B throws, instead
    //       of an 'invalid jump', we get an 'out of gas' error. How do
    //       we distinguish this from an actual out of gas event? (The
    //       testrpc log actually show an 'invalid jump' event.)
    const outOfGas = error.message.search('out of gas') >= 0
    const revert = error.message.search('revert') >= 0
    const invalidJump = error.message.search('invalid JUMP')
    assert(
      invalidOpcode || outOfGas || revert || invalidJump,
      'Expected throw, got \'' + error + '\' instead',
    )

    if (expectedErrorMessage) {
      assert.include(error.message, expectedErrorMessage)
    }

    return
  }
  assert.fail('Expected throw not received')
}
