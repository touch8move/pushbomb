# -*- mode: ruby -*-
# # vi: set ft=ruby :

$num_instances = 2
$instance_name_prefix = "core"

Vagrant.configure("2") do |config|
  
  config.vm.box = "ubuntu/xenial64"

  # (1..$num_instances).each do |i|
  #   config.vm.define vm_name = "%s-%02d" % [$instance_name_prefix, i] do |config|
  #     config.vm.hostname = vm_name

  #     ip = "172.17.8.#{i+100}"
  #     config.vm.network "private_network", ip: ip
  #     # config.ssh.host = ip
  #     if $expose_docker_tcp
  #       config.vm.network "forwarded_port", guest: 2375, host: ($expose_docker_tcp + i - 1), auto_correct: true
  #     end
      
  #     config.vm.network "forwarded_port", guest: 7777, host: 7777, auto_correct: true
  #     config.vm.network "forwarded_port", guest: 27017, host: 27017, auto_correct: true

  #   end
  # end

  
  # config.vm.define "registry" do |registry|
  #   ip = "172.17.8.100"
  #   registry.vm.box = "ubuntu/xenial64"
  #   registry.vm.network "private_network", ip: ip
  #   registry.vm.network "forwarded_port", guest: 2375, host: 2375, auto_correct: true
  #   registry.vm.network "forwarded_port", guest: 7777, host: 7777, auto_correct: true
  #   registry.vm.network "forwarded_port", guest: 27017, host: 27017, auto_correct: true
  # end

  # master
  config.vm.define "master" do |master|
    ip = "172.17.8.101"
    master.vm.box = "ubuntu/xenial64"
    master.vm.network "private_network", ip: ip
    master.vm.network "forwarded_port", guest: 2375, host: 2375, auto_correct: true
    master.vm.network "forwarded_port", guest: 7777, host: 7777, auto_correct: true
    master.vm.network "forwarded_port", guest: 8080, host: 8080, auto_correct: true
    master.vm.network "forwarded_port", guest: 80, host: 80, auto_correct: true
    master.vm.network "forwarded_port", guest: 27017, host: 27017, auto_correct: true
  end

  config.vm.define "worker" do |worker|
    ip = "172.17.8.102"
    worker.vm.box = "ubuntu/xenial64"
    worker.vm.network "private_network", ip: ip
    worker.vm.network "forwarded_port", guest: 2375, host: 2375, auto_correct: true
    worker.vm.network "forwarded_port", guest: 7777, host: 7777, auto_correct: true
    worker.vm.network "forwarded_port", guest: 27017, host: 27017, auto_correct: true
  end
end
