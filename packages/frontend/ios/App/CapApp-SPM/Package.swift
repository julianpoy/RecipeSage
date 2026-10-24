// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.1"),
        .package(name: "CapacitorCommunityKeepAwake", path: "../../../../../node_modules/.pnpm/@capacitor-community+keep-awake@8.0.1_@capacitor+core@8.5.0/node_modules/@capacitor-community/keep-awake"),
        .package(name: "CapacitorFirebaseMessaging", path: "../../../../../node_modules/.pnpm/@capacitor-firebase+messaging@8.4.0_@capacitor+core@8.5.0_firebase@12.19.0/node_modules/@capacitor-firebase/messaging"),
        .package(name: "CapacitorApp", path: "../../../../../node_modules/.pnpm/@capacitor+app@8.1.2_@capacitor+core@8.5.0/node_modules/@capacitor/app"),
        .package(name: "CapacitorBrowser", path: "../../../../../node_modules/.pnpm/@capacitor+browser@8.0.5_@capacitor+core@8.5.0/node_modules/@capacitor/browser"),
        .package(name: "CapacitorCamera", path: "../../../../../node_modules/.pnpm/@capacitor+camera@8.2.6_@capacitor+core@8.5.0/node_modules/@capacitor/camera"),
        .package(name: "CapacitorClipboard", path: "../../../../../node_modules/.pnpm/@capacitor+clipboard@8.0.1_@capacitor+core@8.5.0/node_modules/@capacitor/clipboard"),
        .package(name: "CapacitorFilesystem", path: "../../../../../node_modules/.pnpm/@capacitor+filesystem@8.1.5_@capacitor+core@8.5.0/node_modules/@capacitor/filesystem"),
        .package(name: "CapacitorShare", path: "../../../../../node_modules/.pnpm/@capacitor+share@8.0.1_@capacitor+core@8.5.0/node_modules/@capacitor/share"),
        .package(name: "CapacitorSplashScreen", path: "../../../../../node_modules/.pnpm/@capacitor+splash-screen@8.0.2_@capacitor+core@8.5.0/node_modules/@capacitor/splash-screen"),
        .package(name: "CapawesomeCapacitorAppleSignIn", path: "../../../../../node_modules/.pnpm/@capawesome+capacitor-apple-sign-in@0.1.4_@capacitor+core@8.5.0/node_modules/@capawesome/capacitor-apple-sign-in"),
        .package(name: "CapawesomeCapacitorFilePicker", path: "../../../../../node_modules/.pnpm/@capawesome+capacitor-file-picker@8.1.1_@capacitor+core@8.5.0/node_modules/@capawesome/capacitor-file-picker"),
        .package(name: "CapgoCapacitorNativeNavigation", path: "../../../../../node_modules/.pnpm/@capgo+capacitor-native-navigation@8.13.2_@capacitor+core@8.5.0/node_modules/@capgo/capacitor-native-navigation"),
        .package(name: "CapgoNativePurchases", path: "../../../../../node_modules/.pnpm/@capgo+native-purchases@8.9.6_@capacitor+core@8.5.0/node_modules/@capgo/native-purchases"),
        .package(name: "ErkamyamanCapacitorFoldable", path: "../../../../../node_modules/.pnpm/@erkamyaman+capacitor-foldable@8.4.1_@capacitor+core@8.5.0/node_modules/@erkamyaman/capacitor-foldable"),
        .package(name: "MindlibCapacitorSendIntent", path: "../../../../../node_modules/.pnpm/@mindlib-capacitor+send-intent@8.0.6_@capacitor+core@8.5.0/node_modules/@mindlib-capacitor/send-intent")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorCommunityKeepAwake", package: "CapacitorCommunityKeepAwake"),
                .product(name: "CapacitorFirebaseMessaging", package: "CapacitorFirebaseMessaging"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
                .product(name: "CapacitorBrowser", package: "CapacitorBrowser"),
                .product(name: "CapacitorCamera", package: "CapacitorCamera"),
                .product(name: "CapacitorClipboard", package: "CapacitorClipboard"),
                .product(name: "CapacitorFilesystem", package: "CapacitorFilesystem"),
                .product(name: "CapacitorShare", package: "CapacitorShare"),
                .product(name: "CapacitorSplashScreen", package: "CapacitorSplashScreen"),
                .product(name: "CapawesomeCapacitorAppleSignIn", package: "CapawesomeCapacitorAppleSignIn"),
                .product(name: "CapawesomeCapacitorFilePicker", package: "CapawesomeCapacitorFilePicker"),
                .product(name: "CapgoCapacitorNativeNavigation", package: "CapgoCapacitorNativeNavigation"),
                .product(name: "CapgoNativePurchases", package: "CapgoNativePurchases"),
                .product(name: "ErkamyamanCapacitorFoldable", package: "ErkamyamanCapacitorFoldable"),
                .product(name: "MindlibCapacitorSendIntent", package: "MindlibCapacitorSendIntent")
            ]
        )
    ]
)
