module.exports = {
  commands: [
    require('@react-native-oh/react-native-harmony-cli/dist/commands/link-harmony.js')
      .commandLinkHarmony,
    require('@react-native-oh/react-native-harmony-cli/dist/commands/codegen-harmony.js')
      .commandCodegenHarmony,
  ],
};
