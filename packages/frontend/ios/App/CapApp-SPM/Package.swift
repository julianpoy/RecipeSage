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
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.0"),
        .package(name: "CapacitorApp", path: "../../../../../node_modules/.pnpm/@capacitor+app@8.1.1_@capacitor+core@8.5.0/node_modules/@capacitor/app"),
        .package(name: "CapacitorBrowser", path: "../../../../../node_modules/.pnpm/@capacitor+browser@8.0.4_@capacitor+core@8.5.0/node_modules/@capacitor/browser"),
        .package(name: "CapacitorCamera", path: "../../../../../node_modules/.pnpm/@capacitor+camera@8.2.2_@capacitor+core@8.5.0/node_modules/@capacitor/camera"),
        .package(name: "CapacitorFilesystem", path: "../../../../../node_modules/.pnpm/@capacitor+filesystem@8.1.3_@capacitor+core@8.5.0/node_modules/@capacitor/filesystem"),
        .package(name: "CapacitorFirebaseMessaging", path: "../../../../../node_modules/.pnpm/@capacitor-firebase+messaging@8.4.0_@capacitor+core@8.5.0_firebase@12.14.0/node_modules/@capacitor-firebase/messaging"),
        .package(name: "CapawesomeCapacitorFilePicker", path: "../../../../../node_modules/.pnpm/@capawesome+capacitor-file-picker@8.0.4_@capacitor+core@8.5.0/node_modules/@capawesome/capacitor-file-picker")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
                .product(name: "CapacitorBrowser", package: "CapacitorBrowser"),
                .product(name: "CapacitorCamera", package: "CapacitorCamera"),
                .product(name: "CapacitorFilesystem", package: "CapacitorFilesystem"),
                .product(name: "CapacitorFirebaseMessaging", package: "CapacitorFirebaseMessaging"),
                .product(name: "CapawesomeCapacitorFilePicker", package: "CapawesomeCapacitorFilePicker")
            ]
        )
    ]
)
