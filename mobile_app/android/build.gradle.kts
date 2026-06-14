allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}

subprojects {
    val configureAndroid: Project.() -> Unit = {
        val android = extensions.findByName("android") as? com.android.build.gradle.BaseExtension
        if (android != null) {
            if (android.namespace == null) {
                val cleanProjectName = name.replace("-", "_").replace(".", "_")
                android.namespace = "com.sofianedent.$cleanProjectName"
            }
        }
    }
    if (state.executed) {
        configureAndroid()
    } else {
        afterEvaluate { configureAndroid() }
    }
}
